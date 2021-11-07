const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const { validationResult, matchedData } = require('express-validator')

const User = require('../models/User')
const State = require('../models/State')

module.exports = {
  signin: async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.json({ error: errors.mapped() })
      return
    }

    const data = matchedData(req)
    const { email, password } = data

    const user = await User.findOne({ email })

    if (!user) {
      res.json({ error: 'E-mail ou senha incorreto!' })
      return
    }

    const match = await bcrypt.compare(password, user.passwordHash)
    if (!match) {
      res.json({ error: 'E-mail ou senha incorreto!' })
      return
    }

    const payload = (Date.now() + Math.random()).toString()
    const token = await bcrypt.hash(payload, 10)

    user.token = token
    await user.save()

    return res.json({ token, email })
  },
  signup: async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.json({ error: errors.mapped() })
      return
    }

    const data = matchedData(req)

    const user = await User.findOne({
      email: data.email
    })

    if (user) {
      res.json({ error: { email: { msg: 'E-mail já existe' } } })
      return
    }

    if (mongoose.Types.ObjectId.isValid(data.state)) {
      const state = await State.findById(data.state)

      if (!state) {
        res.json({ error: { state: { msg: 'Estado não existe' } } })
      }
    } else {
      res.json({ error: { state: { msg: 'Código de estado inválido' } } })
    }

    const passwordHash = await bcrypt.hash(data.password, 10)

    const payload = (Date.now() + Math.random()).toString()
    const token = await bcrypt.hash(payload, 10)

    const newUser = new User({
      name: data.name,
      email: data.email,
      passwordHash,
      state: data.state,
      token
    })

    await newUser.save()

    res.json({ token })
  }
}
