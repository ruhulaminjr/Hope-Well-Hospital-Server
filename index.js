const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const objectId = require("mongodb").ObjectId;
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
// firebase token verify setup
const admin = require("firebase-admin");

const serviceAccount = JSON.parse(process.env.FIREBASEAUTH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
async function verifyUserToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const userToken = req.headers.authorization.split(" ")[1];
    console.log(userToken);
    try {
      const decodedUser = await admin.auth().verifyIdToken(userToken);
      req.decodedEmail = decodedUser.email;
    } catch (error) {
      console.log(error);
    }
  }
  next();
}
// middleware
app.use(cors());
app.use(express.json());
// mongodb config
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bdjvz.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
// mongodb connect and server api
async function run() {
  try {
    await client.connect();
    const hopewelldb = client.db("HopeWellDB");
    // database collection
    const usersCollection = hopewelldb.collection("usersCollection");
    const blogsCollection = hopewelldb.collection("blogsCollection");
    const doctorsCollection = hopewelldb.collection("DoctorsCollection");
    // getting blog data
    app.get("/blogs", async (req, res) => {
      const data = await blogsCollection.find({}).toArray();
      res.send(data);
    });
    app.get("/doctors", async (req, res) => {
      const data = await doctorsCollection.find({}).toArray();
      res.send(data);
    });
    // blog add end
    app.post("/adduser", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    app.get("/getadmin/:email", async (req, res) => {
      const email = req.params.email;
      const data = await usersCollection.findOne({ email });
      if (data.role === "admin") {
        res.send({ admin: true });
      } else {
        res.send({ admin: false });
      }
    });
    app.post("/makeadmin/", verifyUserToken, async (req, res) => {
      const userEmail = req.body.email;
      const reqUserEmail = req.decodedEmail;
      const verifyuser = await usersCollection.findOne({
        email: reqUserEmail,
      });
      if (verifyuser.role === "admin") {
        let findUser = await usersCollection.findOne({ email: userEmail });
        if (findUser) {
          console.log(findUser);
          const filter = { email: userEmail };
          const updateDoc = { $set: { role: "admin" } };
          const MakeuserAdmin = await usersCollection.updateOne(
            filter,
            updateDoc,
            {
              upsert: true,
            }
          );
          res.send(MakeuserAdmin);
        }
      } else {
        res.status(401);
      }
    });
  } finally {
  }
}
run().catch((error) => console.log(error));

app.get("/", (req, res) => {
  res.send("Server Running succesfully");
});

app.listen(port, () => {
  console.log(`server running on http http://localhost:${port}/`);
});
