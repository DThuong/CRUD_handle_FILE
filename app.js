const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const multer = require("multer");
const uuid = require("short-uuid");
const validator = require("email-validator");
const session = require("express-session");
const fs = require("fs");
const path = require("path");
// require config dotenv
require("dotenv").config();

// config session
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use("/uploads", express.static("uploads"));

app.set("view engine", "ejs");

const PORT = process.env.PORT || 8080;
console.log(PORT);

// config the original name for file path

// config static files uploads

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

// Đọc dữ liệu từ file
// Lấy dữ liệu sản phẩm từ việc đọc file products
const Read_All_Product = () => {
  const list = fs.readFileSync("products.json");
  const string = list.toString();
  const arr = JSON.parse(string);
  return arr;
};

let data = Read_All_Product();
// console.log(data);


function requireLogIn(req, res, next) {
  if (req.session.isLoggedIn) {
    next();
  } else {
    res.redirect("/login");
  }
}
app.get("/", requireLogIn,(req, res) => {
  res.render("index", { title: "Trang chủ", data });
});
app.get("/login", (req, res) => {
  res.render("login", { title: "Login page", email: '', password: '', error: ''})
});
app.post("/login", (req, res) => {
  const {email, password} = req.body
  let error = undefined
  if(!email){
    error = "Vui lòng nhập email"
  }else if(!validator.validate(email)){
    error = "Email không hợp lệ"
  }
  else if(!password){
    error = "Vui lòng nhập mật khẩu"
  }
  else if(password.length < 6){
    error = "Mật khẩu phải có ít nhất 6 ký tự"
  }
  else if(email !== "admin@gmail.com" || password !== "123456"){
    error = "Sai email hoặc mật khẩu"
  }

  if(error === undefined){ // không có lỗi xảy ra
    console.log("Đăng nhập thành công")
    req.session.isLoggedIn = true;
    res.redirect("/")
  }else{
    res.render("login", { title: "Login page", email, password, error})
  }
});

app.get("/add", (req, res) => {
  res.render("add", {
    error: "",
    name: "",
    price: "",
    desc: "",
    image: "",
    title: "Trang thêm sản phẩm",
  });
});

app.post("/add", (req, res) => {
  let uploader = upload.single("image");
  uploader(req, res, (err) => {
    let { name, price, desc } = req.body;
    let image = req.file;
    let error = "";
    if (!name) {
      error = "Vui lòng nhập tên sản phẩm";
    } else if (!price || isNaN(price) || parseInt(price) < 0) {
      error = "Giá sản phẩm không hợp lệ";
    } else if (!image) {
      error = "Chưa có ảnh hợp lệ";
    } else if (err) {
      error = "Ảnh có kích thước quá lớn";
    } else if (!desc) {
      error = "Vui lòng nhập mô tả sản phẩm";
    }

    if (error.length === 0) {
      const imgPath = "uploads/" + image.filename;
      console.log(imgPath);
      const dataSet = {
        id: uuid.generate(),
        image: imgPath,
        name,
        price,
        desc,
      };
      data.push(dataSet);
      fs.writeFileSync("products.json", JSON.stringify(data, null, 2));
      res.redirect("/");
    } else {
      res.render("add", {
        error,
        desc,
        price,
        name,
        image: image.filename,
        title: "Trang Thêm sản phẩm",
      });
    }
  });
});

app.get("/details/:id",(req, res) => {
  const id = req.params.id;
  const product = data.find((item) => item.id === id);
  if (product) {
    res.render("details", { title: "Trang chi tiết", product });
  } else {
    res.render("notfound", { title: "Not Found" });
  }
});

app.get("/edit/:id", (req, res) => {
  const { id } = req.params;
  const product = data.find((item) => item.id === id);
  if (product) {
    res.render("edit", { title: "Trang chỉnh sửa", p: product, error: "" });
  } else {
    res.render("notfound", { title: "Not Found" });
  }
});

app.post("/edit/:id", (req, res) => {
  const id = req.params.id;
  const p = req.body
  const product = data.findIndex((item) => item.id === id);
  if (product !== -1) { // tìm thấy
    const org = data[product];
    
    org.name = p.name;
    org.price = p.price;
    org.desc = p.desc;

    fs.writeFileSync("products.json", JSON.stringify(data, null, 2));
    res.redirect("/");
  } else {
    res.render("notfound", { title: "Not Found" });
  }
});

app.post("/delete/:id", (req, res) => {
  const id = req.params.id;
  const index = data.findIndex((item) => item.id === id);
  if (index !== -1) {
    const imgPath = data[index].image // lấy đường dẫn ảnh cần xóa
    console.log(imgPath)
    data.splice(index, 1); // Sử dụng splice để xóa sản phẩm khỏi danh sách
    fs.writeFileSync("products.json", JSON.stringify(data, null, 2));
    if (imgPath) {
      const deleteImg = path.join(__dirname, imgPath);
      fs.unlinkSync(deleteImg); // Xóa tệp hình ảnh
    }
    res.json({code: 0, message: "Xóa thành công"})
  } else {
    res.json({message: "Không tìm thấy id"})
  }
})

app.listen(PORT, () => {
  console.log(`Server is runing at http://localhost:${PORT}`);
});
