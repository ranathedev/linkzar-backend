async function adminAuth(req, res) {
  try {
    const token = req.headers.authorization

    if (!token) {
      return res.status(401).send({ error: "Unauthorized: No token provided" })
    }

    if (token !== process.env.ADMIN_KEY) {
      return res.status(403).send({ error: "Forbidden: Invalid token" })
    }
  } catch (error) {
    return res.status(500).send({ error: "Internal Server Error" })
  }
}

module.exports = {
  adminAuth,
}
