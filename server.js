const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// إعداد مجلد لحفظ الملفات المرفوعة
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// إعداد Multer لاستقبال الملفات
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

// مسار لاستقبال الملف وتشغيله
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'لم يتم رفع أي ملف' });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;
    let command = '';
    let args = [];

    // تحديد أمر التشغيل بناءً على امتداد الملف
    if (fileName.endsWith('.py')) {
        command = 'python3';
        args = [filePath];
    } else if (fileName.endsWith('.js')) {
        command = 'node';
        args = [filePath];
    } else {
        return res.status(400).json({ error: 'نوع الملف غير مدعوم. يرجى رفع .py أو .js' });
    }

    // تشغيل الملف (محاكاة التشغيل 24/7)
    console.log(`جاري تشغيل الملف: ${fileName}`);
    
    const process = spawn(command, args);

    // طباعة السجلات في طرفية الخادم
    process.stdout.on('data', (data) => {
        console.log(`[LOG - ${fileName}]: ${data}`);
    });

    process.stderr.on('data', (data) => {
        console.error(`[ERROR - ${fileName}]: ${data}`);
    });

    process.on('close', (code) => {
        console.log(`الملف ${fileName} توقف بكود: ${code}`);
    });

    // الرد على الموقع بأن العملية نجحت
    res.json({ 
        success: true, 
        message: `تم رفع وتشغيل ${fileName} بنجاح!`,
        processId: process.pid
    });
});

// مسار رئيسي للتأكد أن الخادم يعمل
app.get('/', (req, res) => {
    res.send('Nexus Backend is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`الخادم يعمل على المنفذ ${PORT}`);
});