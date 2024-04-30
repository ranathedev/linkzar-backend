const admin = require('firebase-admin')
const Firestore = require('firebase-admin/firestore')
const fs = require('fs')
require('dotenv').config()
const {
  deleteCollection,
  getLinks,
  insertDocuments,
  insertDataObject,
  deleteLink,
  deleteDemoLinks,
  editLink,
} = require('./module.js')

const serviceAccount = {
  type: process.env.TYPE,
  project_id: process.env.PROJECT_ID,
  private_key_id: process.env.PRIVATE_KEY_ID,
  private_key: process.env.PRIVATE_KEY,
  client_email: process.env.CLIENT_EMAIL,
  client_id: process.env.CLIENT_ID,
  auth_uri: process.env.AUTH_URI,
  token_uri: process.env.TOKEN_URI,
  auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.CLIENT_X509_CERT_URL,
  universe_domain: process.env.UNIVERSE_DOMAIN,
}
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})
const db = admin.firestore()

const fastify = require('fastify')({
  logger: false,
})

fastify.register(require('@fastify/cors'), {})

fastify.get('/', async (req, res) => {
  try {
    const htmlContent = await fs.promises.readFile(
      './public/index.html',
      'utf8'
    )

    res.header('Content-Type', 'text/html')

    res.send(htmlContent)
  } catch (err) {
    console.error(err)
    res.status(500).send('Internal Server Error')
  }
})

fastify.post('/api/getLinks', async (req, res) => {
  const uid = req.body.uid
  const response = await getLinks(db, uid)
  res.send(response)
})

fastify.post('/api/deleteColl', async (req, res) => {
  const uid = req.body.uid
  await deleteCollection(db, uid, res)
})

fastify.post('/api/demoLinks', async (req, res) => {
  const { uid, demoLinks } = req.body
  const response = await insertDocuments(db, uid, demoLinks)

  if (response === 'Demo Links added to Database')
    res.send(response).status(200)
  else res.send(response).status(500)
})

fastify.post('/api/delDemoLinksFromMain', async (req, res) => {
  const demoLinks = req.body
  console.log(demoLinks, 'demoLinks to delete from Main Collection')
  await deleteDemoLinks(db, demoLinks, res)
})

fastify.post('/api/shorten', async (req, res) => {
  const { uid, url, shortId } = req.body
  const dataObject = { shortId, originalURL: url }
  const response = await insertDataObject(db, dataObject, uid)
  response ? res.send(response) : res.send({ err: 'Unexpected error occured' })
})

fastify.post('/api/deleteLink', async (req, res) => {
  const { uid, id } = req.body
  const response = await deleteLink(db, id, uid)
  res.send(response)
})

fastify.post('/api/editLink', async (req, res) => {
  const { uid, id, value } = req.body
  const response = await editLink(db, id, value, uid)
  res.send(response)
})

fastify.get('/:shortId', async (req, res) => {
  const shortId = req.params.shortId

  try {
    const allCollections = []
    const collectionsRef = await db.listCollections()
    collectionsRef.forEach(collection => {
      allCollections.push(collection)
    })

    for (const collectionRef of allCollections) {
      const querySnapshot = await collectionRef
        .where('shortId', '==', shortId)
        .get()
      if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0].ref
        const data = querySnapshot.docs[0].data()
        await docRef.update({ clickCounts: Firestore.FieldValue.increment(1) })
        res.redirect(data.originalURL)
        break
      }
    }

    res.status(404).send('URL Data not found')
  } catch (error) {
    console.error('Error retrieving URL:', error)
    res.status(500).send('Internal Server Error')
  } finally {
    await client.close()
  }
})

fastify.listen({ port: 3000, host: '0.0.0.0' }, function (err, address) {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server is listening on ${address}`)
})
