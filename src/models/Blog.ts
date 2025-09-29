import mongoose, { Document, Schema } from 'mongoose';

export interface IBlog extends Document {
  title: string;
  content: string;
  summary?: string;
  images: string[];
  author: mongoose.Types.ObjectId;
  isPublic: boolean;
  tags: string[];
  readTime: number;
  views: number;
  likes: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const blogSchema = new Schema<IBlog>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    minlength: 10
  },
  summary: {
    type: String,
    maxlength: 300,
    trim: true
  },
  images: [{
    type: String,
    validate: {
      validator: function(v: string) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(v);
      },
      message: 'Invalid image URL format'
    }
  }],
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 30
  }],
  readTime: {
    type: Number,
    default: function() {
      // Calculate read time based on content length (average 200 words per minute)
      const wordCount = this.content.split(/\s+/).length;
      return Math.max(1, Math.ceil(wordCount / 200));
    }
  },
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Indexes for better performance
blogSchema.index({ author: 1, createdAt: -1 });
blogSchema.index({ isPublic: 1, createdAt: -1 });
blogSchema.index({ tags: 1 });
blogSchema.index({ title: 'text', content: 'text' });

// Virtual for like count
blogSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Ensure virtual fields are serialized
blogSchema.set('toJSON', { virtuals: true });

export default mongoose.model<IBlog>('Blog', blogSchema);