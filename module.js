const { ObjectId } = require('bson')

const deleteCollection = async (db, uid, res) => {
  try {
    const collectionRef = db.collection(uid)
    const querySnapshot = await collectionRef.get()

    const batch = db.batch()
    querySnapshot.forEach(doc => {
      batch.delete(doc.ref)
    })
    await batch.commit()
    console.log('Collection Deleted.')
    res.send({ message: 'User collection deleted.' }).status(200)
  } catch (error) {
    console.error('Error deleting user collection:', error)
    res.send({ error: 'Internal Server Error' }).status(500)
  }
}

const getLinks = async (db, uid) => {
  try {
    const querySnapshot = await db.collection(uid).get()

    if (!querySnapshot.empty) {
      const allDocuments = querySnapshot.docs.map(doc => doc.data())
      console.log('Links found')
      return allDocuments
    } else return { err: 'Links not found.' }
  } catch (error) {
    return { err: error }
  }
}

const insertDocuments = async (db, uid, demoLinks) => {
  try {
    const collectionRef = db.collection(uid)

    const batch = db.batch()
    for (const item of demoLinks) {
      const docRef = collectionRef.doc(item.id)
      batch.set(docRef, item)
    }
    await batch.commit()

    console.log(`${result.insertedCount} documents inserted.`)
    return 'Demo Links added to Database'
  } catch (error) {
    console.log('Error inserting documents:', error)
    return 'Internal Error'
  }
}

const insertDataObject = async (db, dataObject, uid) => {
  try {
    const allCollections = []
    const collectionsRef = await db.listCollections()
    collectionsRef.forEach(collection => {
      allCollections.push(collection)
    })

    for (const collectionRef of allCollections) {
      const querySnapshot = await collectionRef
        .where('shortId', '==', dataObject.shortId)
        .get()
      if (!querySnapshot.empty) {
        console.log('Alias is taken')
        return { err: 'This alias is already taken.' }
      }
    }

    const docId = generateId()

    const data = {
      ...dataObject,
      id: docId,
      clickCounts: 0,
      createdDate: new Date(),
    }

    await db.collection(uid).doc(docId).set(data)

    return { document: data, count: 1 }
  } catch (error) {
    console.log('Error inserting data object:', error)
    return false
  }
}

const deleteLink = async (db, id, uid) => {
  try {
    await db.collection(uid).doc(id).delete()
    console.log('Link deleted')
    return true
  } catch (error) {
    console.log('Error deleting link:', error)
    return { err: "Error: Can't delete link." }
  }
}

const deleteDemoLinks = async (db, demoLinks, res) => {
  try {
    const collectionRef = db.collection('links')
    const batch = db.batch()
    for (const item of demoLinks) {
      const docRef = collectionRef.doc(item.id)
      batch.delete(docRef)
    }
    await batch.commit()
    res.status(200).send()
  } catch (error) {
    console.log('Error deleting link:', error)
    res.status(500).send()
  }
}

const editLink = async (db, id, newValue, uid) => {
  try {
    const collectionRef = db.collection(uid)
    const querySnapshot = await collectionRef.where('id', '==', id).get()

    if (querySnapshot.empty) {
      return { err: 'No link found with the given id.' }
    }

    const prevDoc = querySnapshot.docs[0].data()
    if (prevDoc.shortId == newValue) {
      console.log('Prev value is same')
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
          console.log('Alias is taken')
          return { error: 'Error: Alias is already taken.' }
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
              console.log('Link edited')
              return updatedDoc
            }
          } else {
            console.log("Can't edit Link")
            return { err: "Error: Can't update the Link." }
          }
        }
      }
    }

    const updatedData = { ...prevDoc, shortId: newValue }
    await collectionRef.doc(id).update(updatedData)
    return updatedData
  } catch (error) {
    console.error('An error occurred:', error)
    return { err: "Error: Can't update the Link." }
  }
}

const generateId = () => new ObjectId().toHexString()

module.exports = {
  deleteCollection,
  getLinks,
  insertDocuments,
  insertDataObject,
  deleteLink,
  deleteDemoLinks,
  editLink,
}
