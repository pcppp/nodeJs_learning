const e = require('express');
var app = require('express');
var router = app.Router(); //可以使用 app.route() 为单个路由路径创建多个处理程序
const formidableMiddleware = require('express-formidable');
var formidable = require('formidable');
const fs = require('fs');
const path = require('path');
const uploadDir = path.join(process.cwd(), 'uploads');

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
    const tempPath = path.join(uploadDir, 'temp');
    let targetPath;
    if ((file.type = 'folder')) {
      targetPath = path.join(uploadDir, fields.path);
    } else {
      targetPath = path.join(uploadDir, fields.path);
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
      // fs.rename();
    }
  });
});

module.exports = router;
