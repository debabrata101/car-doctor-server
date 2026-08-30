const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
} = require("mongodb");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// =========================
// Middleware
// =========================

app.use(cors());
app.use(express.json());

// =========================
// MongoDB
// =========================

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uckzgsu.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;
let serviceCollection;
let bookingCollection;

async function connectDB() {
  if (db) {
    return;
  }

  await client.connect();

  db = client.db("cardoctor");

  serviceCollection = db.collection("services");
  bookingCollection = db.collection("bookings");

  console.log("MongoDB connected");
}

// =========================
// Root
// =========================

app.get("/", (req, res) => {
  res.send("Car Doctor server is running........");
});

// =========================
// JWT
// =========================

app.post("/jwt", async (req, res) => {
  try {
    const user = req.body;

    const token = jwt.sign(
      user,
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "1h",
      }
    );

    res.send({ token });
  } catch (error) {
    res.status(500).send({
      error: true,
      message: error.message,
    });
  }
});

// =========================
// SERVICES
// =========================

// Get all services
app.get("/services", async (req, res) => {
  try {
    await connectDB();

    const result = await serviceCollection
      .find({})
      .toArray();

    res.send(result);
  } catch (error) {
    console.error("Services error:", error);

    res.status(500).send({
      error: true,
      message: error.message,
    });
  }
});

// Get single service
app.get("/services/:id", async (req, res) => {
  try {
    await connectDB();

    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        error: true,
        message: "Invalid service ID",
      });
    }

    const result = await serviceCollection.findOne({
      _id: new ObjectId(id),
    });

    res.send(result);
  } catch (error) {
    res.status(500).send({
      error: true,
      message: error.message,
    });
  }
});

// =========================
// JWT VERIFY
// =========================

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).send({
      error: true,
      message: "Unauthorized access",
    });
  }

  const token = authorization.split(" ")[1];

  jwt.verify(
    token,
    process.env.ACCESS_TOKEN_SECRET,
    (error, decoded) => {
      if (error) {
        return res.status(401).send({
          error: true,
          message: "Unauthorized access",
        });
      }

      req.decoded = decoded;
      next();
    }
  );
};

// =========================
// BOOKINGS
// =========================

app.get("/bookings", verifyJWT, async (req, res) => {
  try {
    await connectDB();

    const decoded = req.decoded;

    if (decoded.email !== req.query.email) {
      return res.status(403).send({
        error: true,
        message: "Forbidden access",
      });
    }

    const result = await bookingCollection
      .find({
        email: req.query.email,
      })
      .toArray();

    res.send(result);
  } catch (error) {
    res.status(500).send({
      error: true,
      message: error.message,
    });
  }
});

// Add booking
app.post("/bookings", async (req, res) => {
  try {
    await connectDB();

    const result = await bookingCollection.insertOne(
      req.body
    );

    res.send(result);
  } catch (error) {
    res.status(500).send({
      error: true,
      message: error.message,
    });
  }
});

// Update booking
app.patch("/bookings/:id", async (req, res) => {
  try {
    await connectDB();

    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        error: true,
        message: "Invalid booking ID",
      });
    }

    const result = await bookingCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          status: req.body.status,
        },
      }
    );

    res.send(result);
  } catch (error) {
    res.status(500).send({
      error: true,
      message: error.message,
    });
  }
});

// Delete booking
app.delete("/bookings/:id", async (req, res) => {
  try {
    await connectDB();

    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        error: true,
        message: "Invalid booking ID",
      });
    }

    const result = await bookingCollection.deleteOne({
      _id: new ObjectId(id),
    });

    res.send(result);
  } catch (error) {
    res.status(500).send({
      error: true,
      message: error.message,
    });
  }
});

// =========================
// Local server
// =========================

if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`Car Doctor server is running on port ${port}`);
  });
}

// =========================
// Vercel
// =========================

module.exports = app;