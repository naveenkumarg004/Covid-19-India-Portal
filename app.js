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
  let jwtToken = null;
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
const reqFormat23 = (obj) => {
  return {
    stateId: obj.state_id,
    stateName: obj.state_name,
    population: obj.population,
  };
};
app.get("/states/", authenticateToken, async (request, response) => {
  const getStatesQuery = `
        select * from state
    `;
  const statesArray = await database.all(getStatesQuery);
  response.send(statesArray.map((each) => reqFormat23(each)));
});

// /states/:stateId/ GET API 3

app.get("/states/:stateId/", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const getOneState = `
        select * from state where state_id = ${stateId}
        `;
  const getOneStateRes = await database.get(getOneState);
  response.send(reqFormat23(getOneStateRes));
});

// /districts/ POST API 4
app.post("/districts/", authenticateToken, async (request, response) => {
  const distDetails = request.body;
  const { districtName, stateId, cases, cured, active, deaths } = distDetails;
  const addDist = `
        insert into district 
        (district_name, state_id, cases, cured, active, deaths)
        values ("${districtName}" , ${stateId} , ${cases} ,
         ${cured} , ${active} , ${deaths})
        `;
  await database.run(addDist);
  response.send("District Successfully Added");
});

// /districts/:districtId/ GET API 5
const reqFormat5 = (obj) => {
  return {
    districtId: obj.district_id,
    districtName: obj.district_name,
    stateId: obj.state_id,
    cases: obj.cases,
    cured: obj.cured,
    active: obj.active,
    deaths: obj.deaths,
  };
};
app.get(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const getDistDetail = `
        select * from district where district_id = ${districtId}
    `;
    const getDistDetailRes = await database.get(getDistDetail);
    response.send(reqFormat5(getDistDetailRes));
  }
);

// /districts/:districtId/ DELETE API 6
app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const delDistQuery = `
        delete from district where district_id = ${districtId}
    `;
    await database.run(delDistQuery);
    response.send("District Removed");
  }
);

// /districts/:districtId/ DELETE API 7
app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const distDetails = request.body;
    const { districtName, stateId, cases, cured, active, deaths } = distDetails;
    const updateDist = `
        update district 
        set 
            district_name = "${districtName}" , 
            state_id = ${stateId} ,
            cases = ${cases},
            cured =${cured} ,
            active = ${active} ,
            deaths = ${deaths}
        where district_id = ${districtId}
    `;
    await database.run(updateDist);
    response.send("District Details Updated");
  }
);

// /states/:stateId/stats/ DELETE API 8

app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;
    const getStats = `
        select
        SUM(cases) AS totalCases ,
        SUM(cured) AS totalCured ,
        SUM(active) AS totalActive ,
        SUM(deaths) AS totalDeaths
        from district where state_id = ${stateId}
    `;
    const stats = await database.get(getStats);
    response.send(stats);
  }
);

module.exports = app;
