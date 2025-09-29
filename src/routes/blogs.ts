import express from 'express';
import Blog from '../models/Blog';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get public blogs with pagination
router.get('/', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const tag = req.query.tag as string;
    const author = req.query.author as string;

    const skip = (page - 1) * limit;

    // Build query
    let query: any = { isPublic: true };

    if (search) {
      query.$text = { $search: search };
    }

    if (tag) {
      query.tags = { $in: [tag.toLowerCase()] };
    }

    if (author) {
      query.author = author;
    }

    const blogs = await Blog.find(query)
      .populate('author', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Blog.countDocuments(query);

    res.json({
      blogs,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ error: 'Failed to fetch blogs' });
  }
});

// Get user's own blogs (private + public)
router.get('/my', requireAuth, async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const blogs = await Blog.find({ author: req.user!._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Blog.countDocuments({ author: req.user!._id });

    res.json({
      blogs,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching user blogs:', error);
    res.status(500).json({ error: 'Failed to fetch your blogs' });
  }
});

// Get single blog
router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('author', 'name avatar bio');

    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    // Check if user can view this blog
    const isOwner = req.user && blog.author._id.toString() === req.user._id.toString();
    
    if (!blog.isPublic && !isOwner) {
      return res.status(403).json({ error: 'This blog is private' });
    }

    // Increment views if not the owner
    if (!isOwner) {
      blog.views += 1;
      await blog.save();
    }

    res.json(blog);
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({ error: 'Failed to fetch blog' });
  }
});

// Create new blog
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { title, content, summary, images, isPublic, tags } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const blog = new Blog({
      title,
      content,
      summary,
      images: images || [],
      author: req.user!._id,
      isPublic: isPublic || false,
      tags: tags || []
    });

    await blog.save();
    await blog.populate('author', 'name avatar');

    res.status(201).json(blog);
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(500).json({ error: 'Failed to create blog' });
  }
});

// Update blog
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    if (blog.author.toString() !== req.user!._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to edit this blog' });
    }

    const { title, content, summary, images, isPublic, tags } = req.body;

    blog.title = title || blog.title;
    blog.content = content || blog.content;
    blog.summary = summary !== undefined ? summary : blog.summary;
    blog.images = images || blog.images;
    blog.isPublic = isPublic !== undefined ? isPublic : blog.isPublic;
    blog.tags = tags || blog.tags;

    await blog.save();
    await blog.populate('author', 'name avatar');

    res.json(blog);
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({ error: 'Failed to update blog' });
  }
});

// Delete blog
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    if (blog.author.toString() !== req.user!._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this blog' });
    }

    await Blog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Blog deleted successfully' });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({ error: 'Failed to delete blog' });
  }
});

// Like/unlike blog
router.post('/:id/like', requireAuth, async (req: AuthRequest, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    const userId = req.user!._id;
    const likeIndex = blog.likes.indexOf(userId);

    if (likeIndex > -1) {
      // Unlike
      blog.likes.splice(likeIndex, 1);
    } else {
      // Like
      blog.likes.push(userId);
    }

    await blog.save();
    res.json({ likes: blog.likes.length, liked: likeIndex === -1 });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

export default router;