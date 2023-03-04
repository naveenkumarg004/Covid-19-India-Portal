const express = require("express");
const app = express();
app.use(express.json());
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

let database = null;
const startServer = async () => {
  try {
    database = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server Running Successfully at localhost:3000");
    });
  } catch (error) {
    console.log(`DB Error : ${error.message}`);
  }
};
startServer();

// /login/ POST API 1
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const getLoginUser = `
    select * from user where username = "${username}"
    `;
  const getLoginUserRes = await database.get(getLoginUser);
  if (getLoginUserRes === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      getLoginUserRes.password
    );
    if (isPasswordMatched === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "QWERTYKEYPAD");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

const authenticateToken = (request, response, next) => {
  let jstToken = null;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "QWERTYKEYPAD", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

// /states/ GET API 2
app.get("/states/", authenticateToken, async (request, response) => {});
