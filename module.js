const { ObjectId } = require("mongodb")

const createCollection = async (client, uid, res) => {
  try {
    await client.connect()
    const database = await client.db("linkzar")

    await database.createCollection(uid)
    await ensureIndexesForCollection(database, uid)

    res.send({ message: "User collection created." }).status(200)
    console.log("Collection created.")
  } catch (error) {
    console.error("Error creating user collection:", error)
    res.send({ error: "Internal Server Error" }).status(500)
  } finally {
    await client.close()
  }
}

const deleteCollection = async (client, uid, res) => {
  try {
    await client.connect()
    const database = await client.db("linkzar")
    await database.dropCollection(uid)

    res.send({ message: "User collection deleted." }).status(200)
    console.log("Collection Deleted.")
  } catch (error) {
    console.error("Error deleting user collection:", error)
    res.send({ error: "Internal Server Error" }).status(500)
  } finally {
    await client.close()
  }
}

const getLinks = async (client, uid) => {
  try {
    await client.connect()
    const database = await client.db("linkzar")
    const collection = await database.collection(uid)
    const cursor = await collection.find()
    const allDocuments = await cursor.toArray()
    console.log("Links found")
    return allDocuments
  } catch (error) {
    return { err: error }
  }
}

const insertDocuments = async (client, uid, demoLinks) => {
  try {
    await client.connect()
    const db = await client.db("linkzar")
    const collection = await db.collection(uid)
    const modifiedArray = demoLinks.map(obj => ({
      ...obj,
      _id: new ObjectId(obj._id),
    }))

    const result = await collection.insertMany(modifiedArray)

    if (result.insertedCount === modifiedArray.length) {
      console.log(`${result.insertedCount} documents inserted.`)
      return "Demo Links added to Database"
    }
  } catch (error) {
    console.log("Error inserting documents:", error)
    return "Internal Error"
  } finally {
    await client.close()
  }
}

const insertDataObject = async (client, dataObject, uid) => {
  try {
    await client.connect()
    const database = await client.db("linkzar")
    const collection = await database.collection(uid)
    const userCollections = await database.listCollections()

    while (await userCollections.hasNext()) {
      const collectionInfo = await userCollections.next()
      const userCollection = await database.collection(collectionInfo.name)

      const urlData = await userCollection.findOne({
        originalURL: dataObject.originalURL,
      })

      const shortLink = await userCollection.findOne({
        shortId: dataObject.shortId,
      })

      if (urlData) {
        console.log("Link is already shortened")
        return { err: "This link is already shortened." }
      } else if (shortLink) {
        console.log("Alias is taken")
        return { err: "This alias is already taken." }
      }
    }

    dataObject.clickCounts = 0
    dataObject.createdDate = new Date()

    const addedDoc = await collection.insertOne(dataObject)
    const docId = addedDoc.insertedId
    const filter = { _id: new ObjectId(docId) }
    const document = await collection.findOne(filter)

    console.log("New Link added")
    return { document, count: 1 }
  } catch (error) {
    console.log("Error inserting data object:", error)
    return false
  } finally {
    await client.close()
  }
}

const deleteLink = async (client, id, uid) => {
  try {
    await client.connect()
    const database = await client.db("linkzar")
    const collection = await database.collection(uid)
    const filter = { _id: new ObjectId(id) }
    const deleteResult = await collection.deleteOne(filter)

    if (deleteResult.deletedCount === 1) {
      console.log("Link deleted")
      return true
    } else {
      console.log("Can't delete Link")
      return { err: "Error: Can't delete link." }
    }
  } catch (error) {
    console.log("Error deleting link:", error)
  } finally {
    client.close()
  }
}

const deleteDemoLinks = async (client, demoLinks, res) => {
  try {
    await client.connect()
    const database = await client.db("linkzar")
    const collection = await database.collection("links")

    let deletedCount = 0
    for (let i = 0; i < demoLinks.length; i++) {
      const shortId = demoLinks[i].shortId
      const result = await collection.deleteOne({ shortId })
      if (result.deletedCount === 1) deletedCount += result.deletedCount
    }

    console.log(
      `${deletedCount} docs deleted from Main Collection successfully.`
    )
    res
      .status(200)
      .send(`${deletedCount} docs deleted from Main Collection successfully.`)
  } catch (error) {
    console.log("Error deleting link:", error)
    res.status(500).send("Error deleting link.")
  } finally {
    client.close()
  }
}

const editLink = async (client, id, newValue, uid) => {
  try {
    await client.connect()
    const database = await client.db("linkzar")
    const collection = await database.collection(uid)
    const filter = { _id: new ObjectId(id) }
    const prevDoc = await collection.findOne(filter)
    if (prevDoc.shortId == newValue) {
      console.log("Prev value is same")
      return prevDoc
    } else {
      const userCollections = database.listCollections()

      while (await userCollections.hasNext()) {
        const collectionInfo = await userCollections.next()
        const userCollection = database.collection(collectionInfo.name)

        const shortLink = await userCollection.findOne({
          shortId: newValue,
        })

        if (shortLink) {
          console.log("Alias is taken")
          return { error: "Error: Alias is already taken." }
        } else {
          const updateOperation = {
            $set: {
              shortId: newValue,
            },
          }

          const updateResult = await collection.updateOne(
            filter,
            updateOperation
          )

          if (updateResult.modifiedCount === 1) {
            const updatedDoc = await collection.findOne({
              _id: new ObjectId(id),
            })

            if (updatedDoc) {
              console.log("Link edited")
              return updatedDoc
            }
          } else {
            console.log("Can't edit Link")
            return { err: "Error: Can't update the Link." }
          }
        }
      }
    }
  } catch (error) {
    console.error("An error occurred:", error)
  } finally {
    await client.close()
  }
}

async function deleteIndexesForCollection(client) {
  try {
    await client.connect()
    const db = client.db("linkzar")
    const userCollections = db.listCollections()

    while (await userCollections.hasNext()) {
      const collectionInfo = await userCollections.next()
      const collection = db.collection(collectionInfo.name)
      await collection.dropIndexes()
    }
  } catch (error) {
    console.error("Error adding indexes:", error)
  } finally {
    await client.close()
  }
}

async function ensureIndexesForCollection(db, collectionName) {
  const collection = db.collection(collectionName)

  await collection.createIndex(
    { shortId: 1 },
    { name: "shortIdIndex", unique: true }
  )
  await collection.createIndex({ createdDate: -1 }, { name: "dateIndex" })

  console.log(`Indexes ensured for collection: ${collectionName}`)
}

async function addIndexesForAllCollections(client) {
  try {
    await client.connect()
    const db = client.db("linkzar")
    const userCollections = db.listCollections()

    while (await userCollections.hasNext()) {
      const collectionInfo = await userCollections.next()
      await ensureIndexesForCollection(db, collectionInfo.name)
    }
  } catch (error) {
    console.error("Error adding indexes:", error)
  } finally {
    await client.close()
  }
}

module.exports = {
  createCollection,
  deleteCollection,
  getLinks,
  insertDocuments,
  insertDataObject,
  deleteLink,
  deleteDemoLinks,
  editLink,
  ensureIndexesForCollection,
  addIndexesForAllCollections,
  deleteIndexesForCollection,
}
