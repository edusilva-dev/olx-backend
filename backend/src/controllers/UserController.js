const { validationResult, matchedData } = require('express-validator')
const bcrypt = require('bcrypt')
const mongoose = require('mongoose')

const Ad = require('../models/Ad')
const Category = require('../models/Category')
const State = require('../models/State')
const User = require('../models/User')

module.exports = {
  getStates: async (req, res) => {
    const states = await State.find()
    res.json({ states })
  },
  info: async (req, res) => {
    let { token } = req.query

    const user = await User.findOne({ token })
    const state = await State.findById(user.state)
    const ads = await Ad.find({ idUser: user._id.toString() })

    const adList = []
    for (let ad of ads) {
      console.log(ad)
      const category = await Category.findById(ad.category)

      adList.push({ ...ad, category: category.slug })
    }

    res.json({
      name: user.name,
      email: user.email,
      state: state.name,
      ads: adList
    })
  },
  editAction: async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.json({ error: errors.mapped() })
      return
    }

    const { token, name, email, password, state } = matchedData(req)

    const updates = {}

    if (name) updates.name = name

    if (email) {
      const emailCheck = await User.find({ email })
      if (emailCheck.length > 0) {
        res.json({ error: 'E-mail já existe' })
        return
      }

      updates.email = email
    }

    if (password) updates.passwordHash = await bcrypt.hash(password, 10)

    if (state) {
      if (mongoose.Types.ObjectId.isValid(state)) {
        const stateCheck = await State.findById(state)
        if (!stateCheck) {
          res.json({ error: 'Estado não existe' })
          return
        }

        updates.state = state
      } else {
        res.json({ error: 'Estado não existe' })
        return
      }
    }

    await User.findOneAndUpdate({ token }, { $set: updates })

    res.json({ message: 'Updated successfully.' })
  }
}
