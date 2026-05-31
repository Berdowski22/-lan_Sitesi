const express = require('express');
const { Client } = require('pg');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const multer = require('multer');
const session = require('express-session');

const app = express();
// Formdan gelen verileri okuyabilmek için gerekli ayar
app.use(bodyParser.urlencoded({ extended: true })); 
app.use(express.json());
app.use(express.static('.')); 

app.use(session({
    secret: 'gizli_bir_anahtar',
    resave: false,
    saveUninitialized: false
}));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage }); 

// PostgreSQL bağlantı ayarların (Kendi şifren ve veritabanı adınla değiştir)
const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'İlan_Sitesi', 
  password: '123', 
  port: 5432,
});

client.connect()
  .then(() => console.log('Veritabanına bağlanıldı!'))
  .catch(err => console.error('Bağlantı hatası', err.stack));

app.post('/register', (req, res) => {
    // Formdan gelen tüm verileri alıyoruz
    const ad = req.body.first_name;
    const soyad = req.body.last_name;
    const dogumTarihi = req.body.dob;
    const email = req.body.email;
    const telefon = req.body.phone;
    const sifre = req.body.password;
    const sifreTekrar = req.body.password_confirm;

    // Şifreler uyuşuyor mu kontrolü
    if (sifre !== sifreTekrar) {
        return res.send('Hata: Şifreler uyuşmuyor! Lütfen geri dönüp tekrar deneyin.');
    }

    const hashlenmisSifre = bcrypt.hashSync(sifre, 10);

    const sqlSorgusu = 'INSERT INTO users (first_name, last_name, dob, email, phone, password_hash) VALUES ($1, $2, $3, $4, $5, $6)';
    const degerler = [ad, soyad, dogumTarihi, email, telefon, hashlenmisSifre];

    client.query(sqlSorgusu, degerler, (err, result) => {
        if (err) {
            console.error('Kayıt sırasında hata:', err.stack);
            res.send('Kayıt başarısız. Bu e-posta adresi zaten kullanılıyor olabilir.');
        } else {
            console.log('Yeni kullanıcı eklendi:', email);
            res.send('Kayıt başarılı! Aramıza hoş geldin. <br><br> <a href="/login.html">Giriş Yapmak İçin Tıklayın</a>');
        }
    });
});

app.post('/login', (req, res) => {
    const gelenEmail = req.body.email; 
    const gelenSifre = req.body.password;  

    const sqlSorgusu = 'SELECT * FROM users WHERE email = $1';
    const degerler = [gelenEmail];

    client.query(sqlSorgusu, degerler, (err, result) => {
        if (err) {
            console.error('Giriş sırasında hata:', err.stack);        
            res.send('Bir hata oluştu. Lütfen tekrar deneyin.');
        } else {
            if (result.rows.length > 0) {
                const user = result.rows[0];
                if (bcrypt.compareSync(gelenSifre, user.password_hash)) {
                    req.session.userId = user.id; 
                    console.log('Kullanıcı giriş yaptı:', gelenEmail);
                    res.redirect('home.html'); 
                } else {
                    res.send('Şifre hatalı. Lütfen tekrar deneyin.');
                }
            } else {
                res.send('Bu e-posta adresiyle kayıtlı bir hesap bulunamadı.');
            }
        }
    });
});

app.post('/add_ads', upload.single('image'), (req, res) => {

    const user_id = req.session.userId; 
    const title = req.body.baslik;
    const price = req.body.fiyat; 
    const category = req.body.kategori;
    const image_url = req.file ? req.file.path : ''; 
    const description = req.body.aciklama; 

    const sqlQuery = "INSERT INTO advertisements (user_id, title, price, category, image_url, description) VALUES ($1, $2, $3, $4, $5, $6)";
    const values = [user_id, title, price, category, image_url, description];

    client.query(sqlQuery, values, (err, result) => {
        if (err) {
            console.error('İlan eklenirken hata oluştu', err.stack);
            return res.status(500).json({ success: false, error: 'İlan eklenemedi' });
        } else {
            console.log('Yeni ilan eklendi:', title);
            return res.status(200).json({ success: true, message: 'İlan başarıyla eklendi!' });
        }
    });
});

app.get('/check_session', (req, res) => {
    if (req.session.userId) {
        res.json({ loggedIn: true, userId: req.session.userId });
    } else {
        res.json({ loggedIn: false });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Çıkış yaparken hata oluştu', err);
            res.send('Çıkış yapılamadı. Lütfen tekrar deneyin.');
        } else {
            res.redirect('home.html'); 
        }
    });
});

app.get('/ads', (req, res) => {
    let sqlQuery;
    let values = [];

    if (req.session.userId) {
        sqlQuery = 'SELECT * FROM advertisements WHERE user_id != $1 ORDER BY created_at DESC';
        values = [req.session.userId];
    } else {
        sqlQuery = 'SELECT * FROM advertisements ORDER BY created_at DESC';
    }

    client.query(sqlQuery, values, (err, result) => {
        if (err) {
            console.error('İlanlar getirilirken hata oluştu', err.stack);
            res.status(500).json({ error: 'İlanlar getirilemedi' });
        } else {
            res.json(result.rows);
        }
    });
});

app.get('/ad/:id', (req, res) => {
    const adId = req.params.id;
    const sqlQuery = 'SELECT * FROM advertisements WHERE id = $1';
    const values = [adId];

    client.query(sqlQuery, values, (err, result) => {
        if (err) {
            console.error('İlan detayı getirilirken hata oluştu', err.stack);
            res.status(500).json({ error: 'İlan detayı getirilemedi' });
        } else {
            if (result.rows.length > 0) {
                res.json(result.rows[0]);
            } else {
                res.status(404).json({ error: 'İlan bulunamadı' });
            }
        }
    });
});

app.get('/my_ads', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Giriş yapmamışsınız' });
    }

    const sqlQuery = 'SELECT * FROM advertisements WHERE user_id = $1 ORDER BY created_at DESC';
    const values = [req.session.userId];

    client.query(sqlQuery, values, (err, result) => {
        if (err) {
            console.error('Kullanıcı ilanları getirilirken hata oluştu', err.stack);
            res.status(500).json({ error: 'İlanlar getirilemedi' });
        } else {
            res.json(result.rows);
        }
    });
});

app.post('/delete_ad', (req, res) => {
    if (!req.session.userId) {
        return res.json({ success: false, error: 'Giriş yapmamışsınız' });
    }

    const adId = req.body.id;
    const sqlQuery = 'DELETE FROM advertisements WHERE id = $1 AND user_id = $2';
    const values = [adId, req.session.userId];

    client.query(sqlQuery, values, (err, result) => {
        if (err) {
            console.error('İlan silinirken hata oluştu', err.stack);
            res.json({ success: false, error: 'İlan silinemedi' });
        } else {
            if (result.rowCount > 0) {
                res.json({ success: true });
            } else {
                res.json({ success: false, error: 'İlan bulunamadı veya yetkiniz yok' });
            }
        }
    });
});

// Favorilere Ekleme / Çıkarma (Toggle) İşlemi
app.post('/toggle_favorite', (req, res) => {
    
    if (!req.session.userId) {
        return res.json({ success: false, error: 'Giriş yapmamışsınız' });
    }
    const userId = req.session.userId;
    const adId = req.body.ad_id;

    const checkOwnerQuery = 'SELECT user_id FROM advertisements WHERE id = $1';
    
    client.query(checkOwnerQuery, [adId], (ownerErr, ownerResult) => {
        if (ownerErr || ownerResult.rows.length === 0) {
            return res.json({ success: false, error: 'İlan bulunamadı veya bir hata oluştu.' });
        }

        const ilanSahibiId = ownerResult.rows[0].user_id;

        if (ilanSahibiId === userId) {
            return res.json({ success: false, error: 'Kendi ilanınızı favorilerinize ekleyemezsiniz!' });
        }

        const checkQuery = 'SELECT * FROM favorites WHERE user_id = $1 AND ad_id = $2';
        
        client.query(checkQuery, [userId, adId], (err, result) => {
            if (err) {
                console.error('Favori kontrolü hatası:', err);
                return res.json({ success: false, error: 'Bir hata oluştu.' });
            }

            if (result.rows.length > 0) {
                const deleteQuery = 'DELETE FROM favorites WHERE user_id = $1 AND ad_id = $2';
                client.query(deleteQuery, [userId, adId], (deleteErr) => {
                    if (deleteErr) return res.json({ success: false, error: 'Silinemedi.' });
                    res.json({ success: true, status: 'removed', message: 'Favorilerden çıkarıldı.' });
                });
            } else {
                const insertQuery = 'INSERT INTO favorites (user_id, ad_id) VALUES ($1, $2)';
                client.query(insertQuery, [userId, adId], (insertErr) => {
                    if (insertErr) return res.json({ success: false, error: 'Eklenemedi.' });
                    res.json({ success: true, status: 'added', message: 'Favorilere eklendi!' });
                });
            }
        });
    });
});

// Kullanıcının Favori İlanlarını Getirme İşlemi (Favorilerim sayfası için)
app.get('/my_favorites', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Giriş yapmalısınız' });
    }

    const sqlQuery = `
        SELECT a.* FROM advertisements a
        JOIN favorites f ON a.id = f.ad_id
        WHERE f.user_id = $1
        ORDER BY f.created_at DESC
    `;

    client.query(sqlQuery, [req.session.userId], (err, result) => {
        if (err) {
            console.error('Favoriler getirilirken hata:', err);
            res.status(500).json({ error: 'Favoriler alınamadı.' });
        } else {
            res.json(result.rows);
        }
    });
});

const PORT = 3010;
app.listen(PORT, () => {
    console.log('Sunucu http://localhost:' + PORT + ' adresinde çalışıyor');
});