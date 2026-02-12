const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

const uploadRoutes = require('./routes/uploadRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Serve uploaded files publicly.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Upload API routes.
app.use('/', uploadRoutes);

// Health check endpoint.
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Upload server is running' });
});

// Centralized error handlers.
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  // Keep logs concise and useful for VPS runtime.
  console.log(`[upload-server] running on port ${PORT}`);
});
