import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import rateLimit from 'express-rate-limit'
import fs from 'fs/promises'
import path from 'path'
import multer from 'multer'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 4000
const UPLOAD_DIR = path.join(__dirname, 'uploads')
const MONGO_URI = process.env.MONGO_URI

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
})

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 2 * 1024 * 1024 },
})

const allowedOrigins = [
  'http://localhost:5173',
  'https://xebiaintern.jeevantverma.tech',
]

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }
      callback(new Error('Not allowed by CORS'))
    },
  }),
)
app.use(express.json())
app.use('/api', limiter)
app.use('/uploads', express.static(UPLOAD_DIR))

const normalizeEmail = (email) => email.trim().toLowerCase()
const isEmail = (value) => /\S+@\S+\.\S+/.test(value)

const removeUploadedFile = async (file) => {
  if (!file?.path) return
  try {
    await fs.unlink(file.path)
  } catch {
    return
  }
}

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    contact: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], required: true },
    password: { type: String, required: true },
    profilePicture: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } },
)

const User = mongoose.model('User', userSchema)

const sanitizeUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  contact: user.contact,
  role: user.role,
  profilePicture: user.profilePicture || '',
  isActive: user.isActive !== false,
  createdAt: user.createdAt,
})

const buildUserErrors = ({ name, email, contact, password, role }, hasFile) => {
  const errors = {}
  if (!name || name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters'
  }
  if (!email || !isEmail(email)) {
    errors.email = 'Enter a valid email address'
  }
  if (!contact || !/^\d{7,15}$/.test(contact)) {
    errors.contact = 'Contact must be 7 to 15 digits'
  }
  if (!password || password.trim().length < 6) {
    errors.password = 'Password must be at least 6 characters'
  }
  if (!role || !['admin', 'user'].includes(role)) {
    errors.role = 'Role must be admin or user'
  }
  if (!hasFile) {
    errors.profilePicture = 'Profile picture is required'
  }
  return errors
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' })
  }

  const user = await User.findOne({
    email: normalizeEmail(email),
    password,
  })

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  if (user.isActive === false) {
    return res.status(403).json({ message: 'Account is disabled' })
  }

  return res.json({
    token: `demo-${user.id}`,
    user: sanitizeUser(user),
  })
})

app.get('/api/users', async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 })
  res.json(users.map(sanitizeUser))
})

app.post('/api/users', upload.single('profilePicture'), async (req, res) => {
  const { name, email, contact, password, role } = req.body || {}
  const errors = buildUserErrors(
    { name, email, contact, password, role },
    Boolean(req.file),
  )

  if (Object.keys(errors).length > 0) {
    await removeUploadedFile(req.file)
    return res.status(400).json({ errors })
  }

  const emailExists = await User.exists({
    email: normalizeEmail(email),
  })
  if (emailExists) {
    await removeUploadedFile(req.file)
    return res.status(409).json({ errors: { email: 'Email already exists' } })
  }

  const profilePicture = req.file
    ? `/uploads/${req.file.filename}`
    : ''

  const newUser = await User.create({
    name: name.trim(),
    email: normalizeEmail(email),
    contact,
    role,
    password,
    profilePicture,
  })

  return res.status(201).json(sanitizeUser(newUser))
})

app.patch('/api/users/:id/status', async (req, res) => {
  const { id } = req.params
  const { isActive } = req.body || {}

  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ message: 'isActive must be boolean' })
  }

  const user = await User.findByIdAndUpdate(
    id,
    { isActive },
    { new: true },
  )

  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  return res.json(sanitizeUser(user))
})

const ensureAdminSeed = async () => {
  const adminExists = await User.exists({ email: 'admin@example.com' })
  if (!adminExists) {
    await User.create({
      name: 'Admin',
      email: 'admin@example.com',
      contact: '0000000000',
      role: 'admin',
      password: 'admin123',
      profilePicture: '',
      isActive: true,
    })
  }
}

const startServer = async () => {
  try {
    if (!MONGO_URI) {
      console.error('Missing MONGO_URI in environment variables')
      process.exit(1)
    }
    await mongoose.connect(MONGO_URI)
    await ensureAdminSeed()
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
