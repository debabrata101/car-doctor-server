const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// JWT
app.post("/jwt", (req, res) => {
  const user = req.body;

  console.log("JWT user:", user);

  const token = jwt.sign(
    user,
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: "1h",
    }
  );

  res.send({ token });
});

// MongoDB
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uckzgsu.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Verify JWT
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

async function run() {
  try {
    await client.connect();

    const db = client.db("cardoctor");

    const serviceCollection = db.collection("services");
    const bookingCollection = db.collection("bookings");

    // =========================
    // SERVICES
    // =========================

    // Get all services
    app.get("/services", async (req, res) => {
      try {
        const result = await serviceCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({
          error: true,
          message: error.message,
        });
      }
    });

    // Get single service
    app.get("/services/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const query = {
          _id: new ObjectId(id),
        };

        const options = {
          projection: {
            title: 1,
            price: 1,
            service_id: 1,
            img: 1,
          },
        };

        const result = await serviceCollection.findOne(
          query,
          options
        );

        res.send(result);
      } catch (error) {
        res.status(500).send({
          error: true,
          message: error.message,
        });
      }
    });

    // =========================
    // BOOKINGS
    // =========================

    // Get bookings for logged-in user
    app.get("/bookings", verifyJWT, async (req, res) => {
      try {
        const decoded = req.decoded;

        console.log("Decoded JWT:", decoded);

        // Check user's email
        if (decoded.email !== req.query.email) {
          return res.status(403).send({
            error: true,
            message: "Forbidden access",
          });
        }

        let query = {};

        if (req.query.email) {
          query = {
            email: req.query.email,
          };
        }

        const result = await bookingCollection
          .find(query)
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
        const booking = req.body;

        console.log("New booking:", booking);

        const result = await bookingCollection.insertOne(booking);

        res.send(result);
      } catch (error) {
        res.status(500).send({
          error: true,
          message: error.message,
        });
      }
    });

    // Update booking status
    app.patch("/bookings/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const filter = {
          _id: new ObjectId(id),
        };

        // FIX: req.body, NOT res.body
        const updatedBooking = req.body;

        const updatedDoc = {
          $set: {
            status: updatedBooking.status,
          },
        };

        const result = await bookingCollection.updateOne(
          filter,
          updatedDoc
        );

        // FIX: res.send, NOT req.send
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
        const id = req.params.id;

        const query = {
          _id: new ObjectId(id),
        };

        const result = await bookingCollection.deleteOne(query);

        res.send(result);
      } catch (error) {
        res.status(500).send({
          error: true,
          message: error.message,
        });
      }
    });

    // MongoDB connection test
    await client.db("admin").command({
      ping: 1,
    });

    console.log(
      "Pinged your deployment. Successfully connected to MongoDB!"
    );
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}

run();

// Root route
app.get("/", (req, res) => {
  res.send("Car Doctor server is running........");
});

// Start server
app.listen(port, () => {
  console.log(`Car Doctor server is running on port ${port}`);
});