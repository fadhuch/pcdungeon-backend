const express = require('express');
const router = express.Router();
const Task = require('../models/task');
const Member = require('../models/member');

// Get all tasks
router.get('/', async (req, res) => {
  try {
    const { status, priority, assignee } = req.query;
    let filter = {};

    // Apply filters
    if (status) {
      filter.status = status;
    }
    if (priority) {
      filter.priority = priority;
    }
    if (assignee) {
      filter.assignee = assignee;
    }

    const tasks = await Task.find(filter)
      .populate('assignee', 'name email')
      .sort({ createdAt: -1 });

    // Calculate statistics
    const allTasks = await Task.find({});
    const stats = {
      total: allTasks.length,
      todo: allTasks.filter(t => t.status === 'todo').length,
      inProgress: allTasks.filter(t => t.status === 'in-progress').length,
      completed: allTasks.filter(t => t.status === 'completed').length,
      overdue: allTasks.filter(t => t.status !== 'completed' && new Date(t.deadline) < new Date()).length
    };

    res.json({
      success: true,
      data: tasks,
      stats,
      count: tasks.length
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tasks',
      error: error.message
    });
  }
});

// Get task by ID
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('assignee', 'name email');
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching task',
      error: error.message
    });
  }
});

// Create new task
router.post('/', async (req, res) => {
  try {
    const { title, description, status, priority, deadline, assignee } = req.body;
    
    if (!title || !deadline) {
      return res.status(400).json({
        success: false,
        message: 'Title and deadline are required'
      });
    }

    // Validate assignee if provided
    if (assignee) {
      const member = await Member.findById(assignee);
      if (!member) {
        return res.status(400).json({
          success: false,
          message: 'Invalid assignee ID'
        });
      }
    }

    const newTask = new Task({
      title,
      description: description || '',
      status: status || 'todo',
      priority: priority || 'medium',
      deadline: new Date(deadline),
      assignee: assignee || null
    });

    const savedTask = await newTask.save();
    const populatedTask = await Task.findById(savedTask._id).populate('assignee', 'name email');
    
    res.status(201).json({
      success: true,
      data: populatedTask,
      message: 'Task created successfully'
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating task',
      error: error.message
    });
  }
});

// Update task
router.put('/:id', async (req, res) => {
  try {
    const { title, description, status, priority, deadline, assignee } = req.body;
    
    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (deadline) updateData.deadline = new Date(deadline);
    if (assignee !== undefined) {
      if (assignee) {
        // Validate assignee if provided
        const member = await Member.findById(assignee);
        if (!member) {
          return res.status(400).json({
            success: false,
            message: 'Invalid assignee ID'
          });
        }
        updateData.assignee = assignee;
      } else {
        updateData.assignee = null;
      }
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('assignee', 'name email');

    if (!updatedTask) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      data: updatedTask,
      message: 'Task updated successfully'
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating task',
      error: error.message
    });
  }
});

// Delete task
router.delete('/:id', async (req, res) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.id);
    
    if (!deletedTask) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    res.json({
      success: true,
      data: deletedTask,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting task',
      error: error.message
    });
  }
});

// Get all members
router.get('/members/all', async (req, res) => {
  try {
    const members = await Member.find({}).sort({ name: 1 });
    res.json({
      success: true,
      data: members,
      count: members.length
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching members',
      error: error.message
    });
  }
});

// Create new member
router.post('/members', async (req, res) => {
  try {
    const { name, email } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    // Check if email already exists
    const existingMember = await Member.findOne({ email: email.toLowerCase() });
    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'Member with this email already exists'
      });
    }

    const newMember = new Member({
      name,
      email: email.toLowerCase()
    });

    const savedMember = await newMember.save();
    
    res.status(201).json({
      success: true,
      data: savedMember,
      message: 'Member added successfully'
    });
  } catch (error) {
    console.error('Error adding member:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Member with this email already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error adding member',
      error: error.message
    });
  }
});

// Get member by ID
router.get('/members/:id', async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    res.json({
      success: true,
      data: member
    });
  } catch (error) {
    console.error('Error fetching member:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching member',
      error: error.message
    });
  }
});

// Update member
router.put('/members/:id', async (req, res) => {
  try {
    const { name, email } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();

    const updatedMember = await Member.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedMember) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    res.json({
      success: true,
      data: updatedMember,
      message: 'Member updated successfully'
    });
  } catch (error) {
    console.error('Error updating member:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Member with this email already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error updating member',
      error: error.message
    });
  }
});

// Delete member
router.delete('/members/:id', async (req, res) => {
  try {
    const deletedMember = await Member.findByIdAndDelete(req.params.id);
    
    if (!deletedMember) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Unassign this member from all tasks
    await Task.updateMany(
      { assignee: req.params.id },
      { assignee: null }
    );
    
    res.json({
      success: true,
      data: deletedMember,
      message: 'Member deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting member',
      error: error.message
    });
  }
});

module.exports = router;
