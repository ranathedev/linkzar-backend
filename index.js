const { MongoClient } = require("mongodb")
const fs = require("fs")
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
} = require("./module")

const fastify = require("fastify")({
  logger: false,
})

fastify.register(require("@fastify/cors"), {})

fastify.register(require("@fastify/view"), {
  engine: {
    ejs: require("ejs"),
  },
  root: path.join(__dirname, "public"),
  viewExt: "html",
  includeViewExtension: true,
})

fastify.register(require("@fastify/static"), {
  root: path.join(__dirname, "public"),
})

const uri = process.env.MONGO_URI
const client = new MongoClient(uri)

fastify.get("/", (req, reply) => {
  reply.view("index.html", { ws: "het" })
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
  try {
    await client.connect()
    const database = client.db("linkzar")
    const userCollections = database.listCollections()
    while (await userCollections.hasNext()) {
      const collectionInfo = await userCollections.next()
      const userCollection = database.collection(collectionInfo.name)
      const urlData = await userCollection.findOne({ shortId })
      if (urlData) {
        await userCollection.updateOne(
          { _id: urlData._id },
          { $inc: { clickCounts: 1 } }
        )
        const originalURL = urlData.originalURL
        res.redirect(originalURL)
        return
      }
    }
    res.status(404).send("URL Data not found")
  } catch (error) {
    console.error("Error retrieving URL:", error)
    res.status(500).send("Internal Server Error")
  } finally {
    await client.close()
  }
})

// fastify.get('/api/findLink', async (req, res) => {
//   const { id } = req.query

//   try {
//     await client.connect()
//     const database = client.db('linkzar')

//     const userCollections = await database.listCollections()

//     while (await userCollections.hasNext()) {
//       const collectionInfo = await userCollections.next()
//       const userCollection = database.collection(collectionInfo.name)

//       const shortLink = await userCollection.findOne({
//         shortId: id,
//       })

//       if (shortLink) {
//         console.log({ collection: collectionInfo.name, data: shortLink })
//       }
//     }

//     res.send('OK').status(200)
//   } catch (error) {
//     console.error('Error creating user collection:', error)
//     res.send('Error').status(500)
//   } finally {
//     await client.close()
//   }
//   res.send(response)
// })

fastify.listen({ port: 3000, host: "0.0.0.0" }, function (err, address) {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server is listening on ${address}`)
})
