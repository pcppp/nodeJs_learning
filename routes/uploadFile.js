const e = require('express');
var app = require('express');
var router = app.Router(); //可以使用 app.route() 为单个路由路径创建多个处理程序
const formidableMiddleware = require('express-formidable');
var formidable = require('formidable');
const fs = require('fs');
const path = require('path');
const uploadDir = path.join(process.cwd(), 'uploads');
const pipeStream = (path, writeStream) => {
  return new Promise((resolve) => {
    const readStream = fs.createReadStream(path);
    readStream.on('end', () => {
      fs.unlinkSync(path);
      resolve();
    });
    readStream.pipe(writeStream);
  });
};

const mergeFileChunk = async (filePath, fileHash, chunkSize) => {
  try {
    const chunkDir = path.resolve(uploadDir, `${fileHash}`);
    console.log(`Chunk directory: ${chunkDir}`);

    const chunkPaths = await fs.readdir(chunkDir);
    console.log(`Chunk paths: ${chunkPaths}`);

    // 根据切片下标进行排序，然后进行合并
    chunkPaths.sort((a, b) => a.split('-')[1] - b.split('-')[1]);
    console.log(`Sorted chunk paths: ${chunkPaths}`);

    // 并发合并写入文件
    await Promise.all(
      chunkPaths.map((chunkPath, index) =>
        pipeStream(
          path.resolve(chunkDir, chunkPath),
          // 根据 chunkSize 在指定位置创建可写流
          fs.createWriteStream(filePath, {
            start: index * chunkSize,
          })
        )
      )
    );
    console.log(`File merged successfully: ${filePath}`);

    // 合并后删除保存切片的目录
    fs.rmdirSync(chunkDir);
    console.log(`Chunk directory removed: ${chunkDir}`);
  } catch (error) {
    console.error(`Error in mergeFileChunk: ${error.message}`);
  }
};

router.post('/mergeChunks', (req, res, next) => {
  const requestBody = req.body;
  mergeFileChunk(requestBody.fileName, requestBody.fileHash, requestBody.chunkSize);
});
router.post('/upLoadFiles', (req, res, next) => {
  const form = new formidable.IncomingForm();
  // 配置 formidable（可选）
  form.uploadDir = path.join(uploadDir, 'temp'); // 设置临时存储目录
  form.keepExtensions = true; // 保留文件扩展名
  if (!fs.existsSync(form.uploadDir)) {
    fs.mkdirSync(form.uploadDir, { recursive: true });
  }
  form.parse(req, (err, fields, files) => {
    const file = files.file;
    let targetPath;
    if (fields.type !== 'fileSlice') {
      targetPath = path.join(uploadDir, fields.path);
    } else {
      if (!fs.existsSync(path.join(uploadDir, fields.hash))) {
        fs.mkdirSync(path.join(uploadDir, fields.hash), { recursive: true });
      }
      targetPath = path.join(uploadDir, fields.hash, fields.hashIndex);
    }
    if (err) {
      if (fields.type === 'folder') {
        if (!fs.existsSync(targetPath)) {
          fs.mkdirSync(targetPath, { recursive: true });
        }
        return res.json({
          message: 'Folder uploaded successfully!',
          filePath: `/uploads/${path.basename(targetPath)}`,
        });
      }
      console.error('Error parsing the files:', err);
      return res.status(500).json({ message: 'Error parsing the files' });
    }
    // 确保目标目录存在
    if (fields.type === 'folder') {
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }
      fs.rm(file.path, { recursive: true, force: true }, (err) => {
        if (err) throw err;
      });
      return res.status(200).json({ message: 'Folder uploaded successfully!' });
    } else if (fields.type === 'fileSlice') {
      if (fs.existsSync(targetPath)) {
        fs.rm(targetPath, { recursive: true, force: true }, (err) => {
          if (err) throw err;
        });
      }
      fs.rename(file.path, targetPath, (err) => {
        if (err) {
          console.error('Error moving the file:', err);
          return res.status(500).json({ message: 'File upload failed' });
        }
        res.json({
          message: 'File uploaded successfully!',
          filePath: `/uploads/${fields.hash}/${fields.hashIndex}`,
        });
      });
    } else {
      if (fs.existsSync(targetPath)) {
        fs.rm(targetPath, { recursive: true, force: true }, (err) => {
          if (err) throw err;
        });
      }
      fs.rename(file.path, targetPath, (err) => {
        if (err) {
          console.error('Error moving the file:', err);
          return res.status(500).json({ message: 'File upload failed' });
        }
        res.json({
          message: 'File uploaded successfully!',
          filePath: `/uploads/${path.basename(targetPath)}`,
        });
      });
    }
  });
});

module.exports = router;
