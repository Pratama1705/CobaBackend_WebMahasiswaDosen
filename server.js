const express = require("express");
const exphbs = require("express-handlebars");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const mongoose = require("mongoose");
const qr = require("qrcode");
const Registrasi = require("./models/registrasi");
const Dosen = require("./models/dosen");
const { hasUncaughtExceptionCaptureCallback } = require("process");

// KONEKSI KE MONGODB
mongoose
  .connect("mongodb+srv://LatihanDB:latihandb@pratama.wyglh.mongodb.net/myFirstDatabase?retryWrites=true&w=majority", {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    autoIndex: false,
  })
  .then(() => console.log("DB Connected"))
  .catch((err) => console.log(`DB Connection Error : ${err.message}`));

// EXPRESS
const app = express();

// AGAR SUPPORT SAAT REGISTRASI
app.use(bodyParser.urlencoded({ extended: true }));

const router = express.Router({ mergeParams: true });

// UNTUK COOKIE
app.use(cookieParser());

// UNTUK VIEW ENGINE
app.engine(
  "hbs",
  exphbs({
    extname: ".hbs",
  })
);
app.set("view engine", "hbs");

// UNTUK MIDDLEWARE TOKEN
app.use((req, res, next) => {
  const authToken = req.cookies["AuthToken"];
  req.user = authTokens[authToken];
  next();
});

// HASHED PASSWORD
const getHashedPassword = (password) => {
  const sha256 = crypto.createHash("sha256");
  const hash = sha256.update(password).digest("base64");
  return hash;
};

// ROUTES
// ------------------------------------------------------GET HOME--------------------------------------------------------------------------
app.get("/", (req, res) => {
  res.render("./home");
});
// -------------------------------------------------------GET DAN POST REGISTER DAN REGISTER DOSEN-------------------------------------------------------------------------
const users = [];

app.get("/dosen-mhs", (req, res) => {
  res.render("./layouts/dosen-or-mhs");
});

app.get("/regis-dosen", (req, res) => {
  res.render("./layouts/regis-dosen");
});

app.post("/regis-dosen", (req, res) => {
  const { email, firstName, lastName, password, confirmPassword } = req.body;

  // PASS DAN CONFIRM PASS SAMA ATAU TIDAK
  if (password === confirmPassword) {
    // CHECK DOUBLE EMAIL
    if (users.find((user) => user.email === email)) {
      res.render("regis-dosen", {
        message: "User already registered.",
        messageClass: "alert-danger",
      });
      return;
    }

    // MEMASUKAN REGISTER DATA BERHASIL KE MONGODB
    const hashedPassword = getHashedPassword(password);
    const regisDosen = new Dosen({
      _id: new mongoose.Types.ObjectId(),
      email,
      firstName,
      lastName,
      password: hashedPassword,
      confirmPassword: hashedPassword,
    });
    regisDosen
      .save()
      .then((result) => {
        console.log(result);
      })
      .catch((err) => console.log(err));

    res.render("./layouts/login-dosen", {
      message: "Registration Complete. Please login to continue.",
      messageClass: "alert-success",
    });
  } else {
    res.render("./layouts/regis-dosen", {
      message: "Password does not match.",
      messageClass: "alert-danger",
    });
  }
});

app.get("/register", (req, res) => {
  res.render("./layouts/register");
});

app.post("/register", (req, res) => {
  const { email, firstName, lastName, password, confirmPassword } = req.body;

  // PASS DAN CONFIRM PASS SAMA ATAU TIDAK
  if (password === confirmPassword) {
    // CHECK DOUBLE EMAIL
    if (users.find((user) => user.email === email)) {
      res.render("register", {
        message: "User already registered.",
        messageClass: "alert-danger",
      });
      return;
    }

    // MEMASUKAN REGISTER DATA BERHASIL KE MONGODB
    const hashedPassword = getHashedPassword(password);
    const register = new Registrasi({
      _id: new mongoose.Types.ObjectId(),
      email,
      firstName,
      lastName,
      password: hashedPassword,
      confirmPassword: hashedPassword,
    });
    register
      .save()
      .then((result) => {
        console.log(result);
      })
      .catch((err) => console.log(err));

    res.render("./layouts/login", {
      message: "Registration Complete. Please login to continue.",
      messageClass: "alert-success",
    });
  } else {
    res.render("./layouts/register", {
      message: "Password does not match.",
      messageClass: "alert-danger",
    });
  }
});
// ----------------------------------------------------GET DAN POST LOGIN MHS DAN DOSEN----------------------------------------------------------------------------
app.get("/login", (req, res) => {
  res.render("./layouts/login");
});

app.get("/login-dosen", (req, res) => {
  res.render("./layouts/login-dosen");
});

const authTokens = {};

const generateAuthToken = () => {
  return crypto.randomBytes(30).toString("hex");
};

app.post("/login-dosen", (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = getHashedPassword(password);

  Dosen.findOne({ email, password: hashedPassword }, (err, result) => {
    if (err) {
      console.log(err);
      res.render("./layouts/login-dosen", {
        message: "Invalid username or password",
        messageClass: "alert-danger",
      });
      return res.status(500);
    }
    if (!result) {
      res.render("./layouts/login-dosen", {
        message: "Invalid username or password",
        messageClass: "alert-danger",
      });
      return res.status(404);
    }
    const authToken = generateAuthToken();
    // Store authentication token
    authTokens[authToken] = result;
    // Setting the auth token in cookies
    res.cookie("AuthToken", authToken);
    // Redirect user to the protected page
    res.redirect("/layouts/protected-dosen");
    return res.status(200).send();
  });
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = getHashedPassword(password);

  Registrasi.findOne({ email, password: hashedPassword }, (err, result) => {
    if (err) {
      console.log(err);
      res.render("./layouts/login", {
        message: "Invalid username or password",
        messageClass: "alert-danger",
      });
      return res.status(500);
    }
    if (!result) {
      res.render("./layouts/login", {
        message: "Invalid username or password",
        messageClass: "alert-danger",
      });
      return res.status(404);
    }
    const authToken = generateAuthToken();
    // Store authentication token
    authTokens[authToken] = result;
    // Setting the auth token in cookies
    res.cookie("AuthToken", authToken);
    // Redirect user to the protected page
    res.redirect("/layouts/protected");
    return res.status(200).send();
  });
});
// ----------------------------------------------------GET PROTECTED KALAU BERHASIL LOGIN MAHASISWA DAN DOSEN----------------------------------------------------------------------------
app.get("/layouts/protected-dosen", (req, res) => {
  if (req.user) {
    Dosen.find({ email: req.user.email }, (err, result) => {
      if (err) {
        console.log("GAGAL MENDAPATKAN DATA!");
        res.status(500);
      }
      res.render("./layouts/protected-dosen", {
        result: req.user.mataKuliah.map((e) => {
          return { nama: e.namaMatkul, id: e.idMatkul };
        }),
      });
    });
  } else {
    res.render("./layouts/login-dosen", {
      message: "Please login to continue",
      messageClass: "alert-danger",
    });
  }
});

app.get("/layouts/protected", (req, res) => {
  if (req.user) {
    Registrasi.find({ email: req.user.email }, (err, result) => {
      if (err) {
        console.log("GAGAL MENDAPATKAN DATA!");
        res.status(500);
      }
      res.render("./layouts/protected", {
        result: req.user.mataKuliah.map((e) => {
          return { nama: e.namaMatkul, id: e.idMatkul };
        }),
      });
    });
  } else {
    res.render("./layouts/login", {
      message: "Please login to continue",
      messageClass: "alert-danger",
    });
  }
});
// ----------------------------------------------------LIHAT DAN EDIT PROFILE MAHASISWA DAN DOSEN----------------------------------------------------------------------------
app.get("/profile-dosen", (req, res) => {
  const user = req.user;
  res.render("./layouts/profile-dosen", {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
  });
});

app.get("/edit-profile-dosen", (req, res) => {
  res.render("./layouts/edit-profile-dosen");
});

app.post("/edit-profile-dosen", (req, res) => {
  Dosen.findOne({ email: req.user.email }, (err, result) => {
    if (err) {
      console.log("GAGAL UPDATE DATA PROFILE!");
      res.status(500);
    }

    let firstName = req.body.firstName.trim();
    let lastName = req.body.lastName.trim();
    let email = req.body.email.trim();

    if (email === "" || firstName === "" || lastName === "") {
      res.render("./layouts/edit-profile", {
        message: "Field Harus Terisi Semua!",
        messageClass: "alert-danger",
      });
      return res.status(500);
    }

    result.firstName = firstName;
    result.lastName = lastName;
    result.email = email;

    result.save((err) => {
      if (err) {
        console.log("GAGAL UPDATE DATA PROFILE!");
        res.status(500);
      }
      res.redirect("./layouts/protected-dosen");
    });
  });
});

app.get("/profile", (req, res) => {
  const user = req.user;
  res.render("./layouts/profile", {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
  });
});

app.get("/edit-profile", (req, res) => {
  res.render("./layouts/edit-profile");
});

app.post("/edit-profile", (req, res) => {
  Registrasi.findOne({ email: req.user.email }, (err, result) => {
    if (err) {
      console.log("GAGAL UPDATE DATA PROFILE!");
      res.status(500);
    }

    let firstName = req.body.firstName.trim();
    let lastName = req.body.lastName.trim();
    let email = req.body.email.trim();

    if (email === "" || firstName === "" || lastName === "") {
      res.render("./layouts/edit-profile", {
        message: "Field Harus Terisi Semua!",
        messageClass: "alert-danger",
      });
      return res.status(500);
    }

    result.firstName = firstName;
    result.lastName = lastName;
    result.email = email;

    result.save((err) => {
      if (err) {
        console.log("GAGAL UPDATE DATA PROFILE!");
        res.status(500);
      }
      res.redirect("./layouts/protected");
    });
  });
});
// ----------------------------------------------------GANTI PASSWORD MAHASISWA DAN DOSEN----------------------------------------------------------------------------
app.get("/change-password-dosen", (req, res) => {
  res.render("./layouts/change-password-dosen");
});

app.post("/change-password-dosen", (req, res) => {
  const { newPass, confirmPass } = req.body;
  const { email } = req.user;

  Dosen.findOne({ email }, (err, result) => {
    if (err) {
      console.log(err);
      res.status(500);
    }
    if (newPass === "" || confirmPass === "") {
      res.render("./layouts/change-password-dosen", {
        message: "Field Harus Terisi Semua!",
        messageClass: "alert-danger",
      });
      return res.status(500);
    }
    if (newPass === confirmPass) {
      const hashedPassword = getHashedPassword(newPass);
      result.password = hashedPassword;
      result.confirmPassword = hashedPassword;
    } else {
      res.render("./layouts/change-password-dosen", {
        message: "New Pass dan Confirm Pass Tidak Sama!",
        messageClass: "alert-danger",
      });
      return res.status(500);
    }
    result.save((err) => {
      if (err) {
        console.log("GAGAL MENGGANTI PASSWORD");
        res.status(500);
      }
      res.render("./layouts/protected-dosen");
      res.status(200);
    });
  });
});

app.get("/change-password", (req, res) => {
  res.render("./layouts/change-password");
});

app.post("/change-password", (req, res) => {
  const { newPass, confirmPass } = req.body;
  const { email } = req.user;

  Registrasi.findOne({ email }, (err, result) => {
    if (err) {
      console.log(err);
      res.status(500);
    }
    if (newPass === "" || confirmPass === "") {
      res.render("./layouts/change-password", {
        message: "Field Harus Terisi Semua!",
        messageClass: "alert-danger",
      });
      return res.status(500);
    }
    if (newPass === confirmPass) {
      const hashedPassword = getHashedPassword(newPass);
      result.password = hashedPassword;
      result.confirmPassword = hashedPassword;
    } else {
      res.render("./layouts/change-password", {
        message: "New Pass dan Confirm Pass Tidak Sama!",
        messageClass: "alert-danger",
      });
      return res.status(500);
    }
    result.save((err) => {
      if (err) {
        console.log("GAGAL MENGGANTI PASSWORD");
        res.status(500);
      }
      res.render("./layouts/protected");
      res.status(200);
    });
  });
});
// ------------------------------------------------ADD MATAKULIAH------------------------------------------------
app.get("/add-matkul-dosen", (req, res) => {
  res.render("./layouts/add-matkul-dosen");
});

app.post("/add-matkul-dosen", (req, res) => {
  const { email, firstName, lastName } = req.user;
  const { idMatkul, namaMatkul } = req.body;
  Dosen.findOne({ email }, (err, result) => {
    if (err) {
      console.log("GAGAL MENAMBAHKAN MATAKULIAH");
      res.status(500);
    }
    if (idMatkul === "" || namaMatkul === "") {
      res.render("./layouts/protected-dosen", {
        message: "Gagal Menambahkan Matakuliah!",
        messageClass: "alert-danger",
      });
      return res.status(500);
    } else {
      for (let i = result.mataKuliah.length - 1; i >= 0; --i) {
        if (result.mataKuliah[i].idMatkul == idMatkul) {
          res.render("./layouts/protected-dosen", {
            message: "Gagal Menambahkan Matakuliah!",
            messageClass: "alert-danger",
          });
          return res.status(500);
        }
      }
      result.mataKuliah.push(
        {
          idMatkul,
          namaMatkul,
          namaDosen: `${firstName} ${lastName}`,
          pertemuan: [],
        },
        (err) => {
          if (err) {
            console.log("ERROR!");
            res.status(500);
          }
          res.status(200);
        }
      );
      result.save((err) => {
        if (err) {
          console.log("GAGAL MENAMBAH MATKUL!");
          res.status(500);
        }
        res.render("./layouts/protected-dosen", {
          message: "Berhasil Menambahkan Matakuliah!, keluar dan masuk kembali untuk melihat matakuliah!",
          messageClass: "alert-success",
        });
        res.status(200);
      });
    }
  });
});

app.get("/add-matkul", (req, res) => {
  res.render("./layouts/add-matkul");
});

app.post("/add-matkul", (req, res) => {
  const { email } = req.user;
  const { idMatkul } = req.body;
  Registrasi.findOne({ email }, (err, result) => {
    if (err) {
      console.log("GAGAL MENAMBAHKAN MATAKULIAH");
      res.status(500);
    }
    if (idMatkul === "") {
      res.render("./layouts/protected", {
        message: "Gagal Menambahkan Matakuliah!",
        messageClass: "alert-danger",
      });
      return res.status(500);
    } else {
      for (let i = result.mataKuliah.length - 1; i >= 0; --i) {
        if (result.mataKuliah[i].idMatkul == idMatkul) {
          res.render("./layouts/protected", {
            message: "Gagal Menambahkan Matakuliah!",
            messageClass: "alert-danger",
          });
          return res.status(500);
        }
      }
      Dosen.find({ mataKuliah: { $elemMatch: { idMatkul } } }, (err, result) => {
        if (err) {
          console.log("ERROR GAN!!");
          res.status(500);
        }
        for (let i = 0; i < result.length; i++) {
          for (let j = 0; j < result[i].mataKuliah.length; j++) {
            if (result[i].mataKuliah[j].idMatkul == idMatkul) {
              Registrasi.findOne({ email }, (err, result_2) => {
                if (err) {
                  console.log("ERROR GAN!!");
                  res.status(500);
                }
                result_2.mataKuliah.push({
                  idMatkul: result[i].mataKuliah[j].idMatkul,
                  namaMatkul: result[i].mataKuliah[j].namaMatkul,
                  namaDosen: result[i].mataKuliah[j].namaDosen,
                  matkulQR: `${result[i].mataKuliah[j].idMatkul}-${Math.random()}`,
                });
                console.log(result_2);
                result_2.save((err) => {
                  if (err) {
                    console.log("GAGAL MENAMBAH MATKUL!");
                    res.status(500);
                  }
                  res.render("./layouts/protected", {
                    message: "Berhasil Menambahkan Matakuliah!, keluar dan masuk kembali untuk melihat matakuliah!",
                    messageClass: "alert-success",
                  });
                  res.status(200);
                });
              });
            }
          }
        }
      });
    }
  });
});
// ------------------------------------------------HAPUS MATKUL------------------------------------------------
app.post("/delete-matkul-dosen/:idMatkul", (req, res) => {
  const { email } = req.user;
  const { idMatkul } = req.params;
  Dosen.findOne({ email }, (err, result) => {
    if (err) {
      console.log("ERROR");
      res.status(500);
    }
    for (let i = result.mataKuliah.length - 1; i >= 0; --i) {
      if (result.mataKuliah[i].idMatkul == idMatkul) {
        result.mataKuliah.splice(i, 1);

        result.save((err) => {
          if (err) {
            console.log("GAGAL MENAMBAH MATKUL!");
            res.status(500);
          }
          res.render("./layouts/protected-dosen", {
            message: "Berhasil Menghapus Matakuliah!. Keluar dan Masuk Kembali Untuk Melihat Matakuliah!",
            messageClass: "alert-success",
          });
          res.status(200);
        });
      }
    }
  });
});
app.post("/delete-matkul/:idMatkul", (req, res) => {
  const { email } = req.user;
  const { idMatkul } = req.params;
  Registrasi.findOne({ email }, (err, result) => {
    if (err) {
      console.log("ERROR");
      res.status(500);
    }
    for (let i = result.mataKuliah.length - 1; i >= 0; --i) {
      if (result.mataKuliah[i].idMatkul == idMatkul) {
        result.mataKuliah.splice(i, 1);

        result.save((err) => {
          if (err) {
            console.log("GAGAL MENAMBAH MATKUL!");
            res.status(500);
          }
          res.render("./layouts/protected", {
            message: "Berhasil Menghapus Matakuliah!. Keluar dan Masuk Kembali Untuk Melihat Matakuliah!",
            messageClass: "alert-success",
          });
          res.status(200);
        });
      }
    }
  });
});
// ------------------------------------------------MENAMPILKAN DETAIL MATAKULIAH DOSEN DAN MAHASISWA--------------------------------------------------------------------------------
app.get("/detail-matkul-dosen/:idMatkul", (req, res) => {
  const { idMatkul } = req.params;
  const { email } = req.user;
  Dosen.find({ email }, (err, result) => {
    if (err) {
      console.log("ERROR GAN!");
      throw err;
    }
    for (let i = 0; i < result.length; i++) {
      result[i].mataKuliah.find((e) => {
        if (e.idMatkul === idMatkul) {
          if (e.pertemuan.length == 0) {
            res.render("./layouts/detail-matkul-dosen", {
              idMatkul: e.idMatkul,
              namaMatkul: e.namaMatkul,
              namaDosen: e.namaDosen,
              pertemuan: "-",
            });
          } else {
            res.render("./layouts/detail-matkul-dosen", {
              idMatkul: e.idMatkul,
              namaMatkul: e.namaMatkul,
              namaDosen: e.namaDosen,
              pertemuan: e.pertemuan[0].tanggal + " / " + e.pertemuan[0].waktu,
            });
          }
        }
      });
    }
  });
});
app.get("/detail-matkul/:idMatkul", (req, res) => {
  const { idMatkul } = req.params;
  const { email } = req.user;
  Registrasi.find({ email }, (err, result) => {
    if (err) {
      console.log("ERROR GAN!");
      throw err;
    }
    for (let i = 0; i < result.length; i++) {
      result[i].mataKuliah.find((e) => {
        if (e.idMatkul === idMatkul) {
          qr.toDataURL(e.matkulQR, (err, result) => {
            if (err) {
              console.log("ERROR");
              res.status(500);
            }
            res.render("./layouts/detail-matkul", {
              idMatkul: e.idMatkul,
              namaMatkul: e.namaMatkul,
              namaDosen: e.namaDosen,
              qrMatkul: result,
              pertemuan: Dosen.find({ mataKuliah: { $elemMatch: { idMatkul } } }, (err, result) => {
                if (err) {
                  console.log("ERROR GAN!!");
                  res.status(500);
                }
                for (let i = 0; i < result.length; i++) {
                  for (let j = 0; j < result[i].mataKuliah.length; j++) {
                    if (result[i].mataKuliah[j].idMatkul == idMatkul) {
                      console.log(result[i].mataKuliah[j].pertemuan.length);
                      if (result[i].mataKuliah[j].pertemuan.length == 0) {
                        pertemuan = "-";
                        return pertemuan;
                      } else {
                        tangJam = result[i].mataKuliah[j].pertemuan[0];
                        pertemuan = tangJam.tanggal + " / " + tangJam.waktu;
                      }
                    }
                  }
                }
                console.log(JSON.stringify(pertemuan));
                return JSON.stringify(pertemuan);
              }),
            });
          });
        }
      });
    }
  });
});
// ------------------------------------------------TAMBAH PERTEMUAN (DOSEN)------------------------------------------------
app.post("/addPertemuan/:idMatkul", (req, res) => {
  const { email } = req.user;
  const { idMatkul } = req.params;
  const { tanggal, waktu } = req.body;

  Dosen.findOne({ email }, (err, result) => {
    if (err) {
      console.log("ERROR GAN!");
      throw err;
    }
    for (let i = result.mataKuliah.length - 1; i >= 0; --i) {
      if (result.mataKuliah[i].idMatkul == idMatkul) {
        result.mataKuliah[i].pertemuan.unshift({
          tanggal: tanggal,
          waktu: waktu,
          daftarHadir: [],
        });
        console.log(result.mataKuliah[i].pertemuan);
        result.mataKuliah[i].pertemuan.splice(3, 1);
        result.markModified("mataKuliah");
        result.save((err) => {
          if (err) {
            console.log("ERROR");
            throw err;
          }
          res.render("./layouts/protected-dosen", {
            message: "Berhasil Menambah Pertemuan!",
            messageClass: "alert-success",
          });
          console.log(result.mataKuliah[i]);
          res.status(200);
        });
      }
    }
  });
});
// ------------------------------------------------ABSEN--------------------------------------------------------------------------------
app.post("/absen/:idMatkul", (req, res) => {
  const { kode_matkul_qr } = req.body;
  const { idMatkul } = req.params;
  const { email, firstName, lastName } = req.user;

  console.log(email);
  Registrasi.find({ email }, (err, result) => {
    if (err) {
      console.log("ERRORRR 222");
      res.status(500);
    }
    for (let i = 0; i < result[0].mataKuliah.length; i++) {
      if (result[0].mataKuliah[i].idMatkul == idMatkul) {
        if (result[0].mataKuliah[i].matkulQR == kode_matkul_qr) {
          Dosen.find({ mataKuliah: { $elemMatch: { idMatkul } } }, (err, result) => {
            if (err) {
              console.log("ERR OO RRRR");
              res.status(500);
            }
            for (let i = 0; i < result[0].mataKuliah.length; i++) {
              if ((result[0].mataKuliah[i].idMatkul = idMatkul)) {
                result[0].mataKuliah[i].pertemuan[0].daftarHadir.push({
                  email: email,
                  nama: `${firstName} ${lastName}`,
                  keterangan: "HADIR",
                });
                console.log(result[0].mataKuliah[i].pertemuan[0]);
                result[0].markModified("mataKuliah");
                result[0].save((err) => {
                  if (err) {
                    console.log("GAGAL MENAMBAH ABSEN!");
                    res.status(500);
                  }
                  res.render("./layouts/protected", {
                    message: "Berhasil Mengabsen!",
                    messageClass: "alert-success",
                  });
                  res.status(200);
                });
                break;
              }
            }
          });
        }
      }
    }
  });
});
// ------------------------------------------------LOGOUT--------------------------------------------------------------------------------
app.get("/logout-dosen", (req, res) => {
  cookie = req.cookies;
  for (var prop in cookie) {
    if (!cookie.hasOwnProperty(prop)) {
      continue;
    }
    res.cookie(prop, "", { expires: new Date(0) });
    console.log("User Logged Out");
  }
  res.redirect("/login-dosen");
});
app.get("/logout", (req, res) => {
  cookie = req.cookies;
  for (var prop in cookie) {
    if (!cookie.hasOwnProperty(prop)) {
      continue;
    }
    res.cookie(prop, "", { expires: new Date(0) });
    console.log("User Logged Out");
  }
  res.redirect("/login");
});

// Server Listen
const port = 3000;
app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});
