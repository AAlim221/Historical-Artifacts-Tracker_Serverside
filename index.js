const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

// mongodb uri
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster2.yhk4q5h.mongodb.net/?retryWrites=true&w=majority&appName=Cluster2`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const artifactsCollection = client
      .db("artifactVaultDB")
      .collection("artifacts");

    // get all artifacts
    app.get("/artifacts", async (req, res) => {
      const result = await artifactsCollection.find().toArray();
      res.send(result);
    });

    // search artifacts by name
    app.get("/search-artifacts", async (req, res) => {
      const search = req.query.search || "";

      const query = {
        artifactName: {
          $regex: search,
          $options: "i",
        },
      };

      const result = await artifactsCollection.find(query).toArray();
      res.send(result);
    });

    // featured artifacts - highest like count
    app.get("/featured-artifacts", async (req, res) => {
      const result = await artifactsCollection
        .find()
        .sort({ likeCount: -1 })
        .limit(6)
        .toArray();

      res.send(result);
    });

    // get single artifact
    app.get("/artifacts/:id", async (req, res) => {
      const id = req.params.id;

      const query = {
        _id: new ObjectId(id),
      };

      const result = await artifactsCollection.findOne(query);
      res.send(result);
    });
    app.patch("/artifacts/like-toggle/:id", async (req, res) => {
  const id = req.params.id;
  const { email } = req.body;

  const artifact = await artifactsCollection.findOne({
    _id: new ObjectId(id),
  });

  const alreadyLiked = artifact?.likedBy?.includes(email);

  const updateDoc = alreadyLiked
    ? {
        $inc: { likeCount: -1 },
        $pull: { likedBy: email },
      }
    : {
        $inc: { likeCount: 1 },
        $addToSet: { likedBy: email },
      };

  const result = await artifactsCollection.updateOne(
    { _id: new ObjectId(id) },
    updateDoc
  );

  res.send(result);
});

    // add artifact
    app.post("/artifacts", async (req, res) => {
      const artifact = req.body;

      const newArtifact = {
        ...artifact,
        likeCount: 0,
        likedBy: [],
      };

      const result = await artifactsCollection.insertOne(newArtifact);
      res.send(result);
    });

    // my artifacts
    app.get("/my-artifacts", async (req, res) => {
      const email = req.query.email;

      const query = {
        adderEmail: email,
      };

      const result = await artifactsCollection.find(query).toArray();
      res.send(result);
    });

    // liked artifacts
    app.get("/liked-artifacts", async (req, res) => {
      const email = req.query.email;

      const query = {
        likedBy: email,
      };

      const result = await artifactsCollection.find(query).toArray();
      res.send(result);
    });

    // like artifact
    app.patch("/artifacts/like/:id", async (req, res) => {
      const id = req.params.id;
      const { email } = req.body;

      const filter = {
        _id: new ObjectId(id),
      };

      const updateDoc = {
        $inc: {
          likeCount: 1,
        },
        $addToSet: {
          likedBy: email,
        },
      };

      const result = await artifactsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // update artifact
    // important: this does NOT update likeCount, likedBy, adderName, adderEmail
    app.put("/artifacts/:id", async (req, res) => {
      const id = req.params.id;
      const updatedArtifact = req.body;

      const filter = {
        _id: new ObjectId(id),
      };

      const updateDoc = {
        $set: {
          artifactName: updatedArtifact.artifactName,
          artifactImage: updatedArtifact.artifactImage,
          artifactType: updatedArtifact.artifactType,
          historicalContext: updatedArtifact.historicalContext,
          shortDescription: updatedArtifact.shortDescription,
          createdAt: updatedArtifact.createdAt,
          discoveredAt: updatedArtifact.discoveredAt,
          discoveredBy: updatedArtifact.discoveredBy,
          presentLocation: updatedArtifact.presentLocation,
        },
      };

      const result = await artifactsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // delete artifact
    app.delete("/artifacts/:id", async (req, res) => {
      const id = req.params.id;

      const query = {
        _id: new ObjectId(id),
      };

      const result = await artifactsCollection.deleteOne(query);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log("MongoDB connected successfully!");
  } finally {
    // do not close client
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Historical Artifacts Tracker Server is running");
});

app.listen(port, () => {
  console.log(`Artifact server is running on port: ${port}`);
});