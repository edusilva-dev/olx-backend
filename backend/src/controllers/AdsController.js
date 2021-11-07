const { v4: uuid } = require('uuid')
const jimp = require('jimp')

const Category = require('../models/Category')
const User = require('../models/User')
const Ad = require('../models/Ad')
const State = require('../models/State')

const addImage = async buffer => {
  const newName = `${uuid()}.jpg`
  const tmpImg = await jimp.read(buffer)
  tmpImg.cover(500, 500).quality(80).write(`./public/media/${newName}`)
  return newName
}

module.exports = {
  getCategories: async (req, res) => {
    const categoriesDb = await Category.find()

    const categories = []
    for (let category of categoriesDb) {
      categories.push({
        ...category._doc,
        img: `${process.env.BASE}/assets/images/${category.slug}.png`
      })
    }

    res.json({ categories })
  },
  addAction: async (req, res) => {
    let { title, price, priceNegotiable, description, category, token } = req.body
    console.log(category)
    const user = await User.findOne({ token }).exec()

    if (!title || !category) {
      res.json({ error: 'Título e/ou categoria não foram preenchidos' })
      return
    }

    price
      ? (price = parseFloat(price.replace('.', '').replace(',', '.').replace('R$ ', '')))
      : (price = 0)

    const newAd = new Ad()
    newAd.status = true
    newAd.idUser = user._id
    newAd.state = user.state
    newAd.dateCreated = new Date()
    newAd.title = title
    newAd.category = category
    newAd.price = price
    newAd.priceNegotiable = !!priceNegotiable
    newAd.description = description
    newAd.views = 0

    if (req.files && req.files.img) {
      console.log(req.files, req.files.img)
      if (req.files.img.length == undefined) {
        if (['image/jpeg', 'image/jpg', 'image/png'].includes(req.files.img.mimetype)) {
          const url = await addImage(req.files.img.data)
          newAd.images.push({ url, default: false })
        }
      } else {
        for (let image in req.files.img) {
          if (['image/jpeg', 'image/jpg', 'image/png'].includes(image.mimetype)) {
            const url = await addImage(image.data)
            newAd.images.push({ url, default: false })
          }
        }
      }
    }

    if (newAd.images.length > 0) newAd.images[0].default = true

    const ad = await newAd.save()

    res.json({ id: ad._id })
  },
  getList: async (req, res) => {
    const { sort = 'asc', offset = 0, limit = 8, query, category, state } = req.query
    const filters = { status: true }

    if (query) filters.title = { $regex: query, $options: 'i' }

    if (category) {
      const c = await Category.findOne({ slug: category }).exec()
      if (c) {
        filters.category = c._id.toString()
      }
    }

    if (state) {
      const s = await State.findOne({ name: state.toUpperCase() }).exec()
      s && (filters.state = s._id.toString())
    }

    const adsTotal = (await Ad.find(filters).exec()).length

    const adsData = await Ad.find(filters)
      .sort({ dateCreated: sort == 'desc' ? -1 : 1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .exec()

    const ads = []
    for (let ad of adsData) {
      let image
      let defaultImg = ad.images.find(image => image.default)
      if (defaultImg) {
        image = `${process.env.BASE}/media/${defaultImg.url}`
      } else {
        image = `${process.env.BASE}/media/default.jpg`
      }

      ads.push({
        id: ad._id,
        title: ad.title,
        price: ad.price,
        priceNegotiable: ad.priceNegotiable,
        image
      })
    }

    res.json({ ads, total: adsTotal })
  },
  getItem: async (req, res) => {
    const { id, other = null } = req.query

    if (!id) {
      res.json({ error: 'Sem produto!' })
      return
    }

    if (id.length < 12) {
      res.json({ error: 'Id inválido' })
      return
    }

    const ad = await Ad.findById(id)
    if (!ad) {
      res.json({ error: 'Produto inexistente' })
      return
    }

    ad.views++
    await ad.save()

    const images = []
    for (let image of ad.images) {
      console.log(image)
      images.push(`${process.env.BASE}/media/${image.url}`)
    }

    const category = await Category.findById(ad.category).exec()
    const userInfos = await User.findById(ad.idUser).exec()
    const state = await State.findById(ad.state).exec()

    res.json({
      id: ad.id,
      title: ad.title,
      price: ad.price,
      priceNegotiable: ad.priceNegotiable,
      description: ad.description,
      dateCreated: ad.dateCreated,
      views: ad.views,
      images,
      category,
      userInfos: {
        name: userInfos.name,
        email: userInfos.email
      },
      state: state.name
    })
  },
  editAction: async (req, res) => {}
}
