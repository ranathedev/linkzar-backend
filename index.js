const { MongoClient } = require("mongodb")
require("dotenv").config()
const {
  createCollection,
  deleteCollection,
  getLinks,
  insertDocuments,
  insertDataObject,
  deleteLink,
  deleteDemoLinks,
  editLink,
  addIndexesForAllCollections,
  deleteIndexesForCollection,
} = require("./module")
const { adminAuth } = require("./middleware")

const fastify = require("fastify")({
  logger: false,
})

fastify.register(require("@fastify/cors"), {})

const client = new MongoClient(process.env.MONGO_URI)

fastify.get("/", async (req, res) => {
  res.send("Linkzar Server is working fine...")
})

fastify.get("/addIndexes", { preHandler: adminAuth }, async (req, res) => {
  try {
    await addIndexesForAllCollections(client)
    res.send("Added Indexes of All Collections")
  } catch (error) {
    console.log(error)
    res.status(500).send("Error Adding Indexes")
  }
})

fastify.get("/deleteIndexes", { preHandler: adminAuth }, async (req, res) => {
  try {
    await deleteIndexesForCollection(client)
    res.send("Deleted Indexes of All Collections")
  } catch (error) {
    console.log(error)
    res.status(500).send("Error Deleting Indexes")
  }
})

fastify.post("/api/getLinks", async (req, res) => {
  const uid = req.body.uid
  const response = await getLinks(client, uid)
  res.send(response)
})

fastify.post("/api/createColl", async (req, res) => {
  const uid = req.body.uid
  await createCollection(client, uid, res)
})

fastify.post("/api/deleteColl", async (req, res) => {
  const uid = req.body.uid
  await deleteCollection(client, uid, res)
})

fastify.post("/api/demoLinks", async (req, res) => {
  const { uid, demoLinks } = req.body
  const response = await insertDocuments(client, uid, demoLinks)
  if (response === "Demo Links added to Database")
    res.send(response).status(200)
  else res.send(response).status(500)
})

fastify.post("/api/delDemoLinksFromMain", async (req, res) => {
  const demoLinks = req.body
  console.log(demoLinks, "demoLinks to delete from Main Collection")
  await deleteDemoLinks(client, demoLinks, res)
})

fastify.post("/api/shorten", async (req, res) => {
  const { uid, url, shortId } = req.body
  const dataObject = { shortId, originalURL: url }
  const response = await insertDataObject(client, dataObject, uid)
  response ? res.send(response) : res.send({ err: "Unexpected error occured" })
})

fastify.post("/api/deleteLink", async (req, res) => {
  const { uid, id } = req.body
  const response = await deleteLink(client, id, uid)
  res.send(response)
})

fastify.post("/api/editLink", async (req, res) => {
  const { uid, id, value } = req.body
  const response = await editLink(client, id, value, uid)
  res.send(response)
})

fastify.get("/:shortId", async (req, res) => {
  const shortId = req.params.shortId
  if (!!shortId) {
    try {
      await client.connect()
      const database = client.db("linkzar")
      const userCollections = database.listCollections()
      while (await userCollections.hasNext()) {
        const collectionInfo = await userCollections.next()
        const userCollection = database.collection(collectionInfo.name)
        const urlData = await userCollection.findOneAndUpdate(
          { shortId },
          { $inc: { clickCounts: 1 } },
          { returnDocument: "after", includeResultMetadata: false }
        )

        if (urlData) {
          return res.redirect(urlData.originalURL)
        }
      }
      res.status(404).send("URL Data not found")
    } catch (error) {
      console.error("Error retrieving URL:", error)
      res.status(500).send("Internal Server Error")
    } finally {
      await client.close()
    }
  }
})

fastify.listen({ port: 3000, host: "0.0.0.0" }, function (err, address) {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server is listening on ${address}`)
})
