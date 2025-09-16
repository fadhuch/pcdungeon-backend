// Task management controller
const taskController = {
  // Get all tasks with optional filtering
  getAllTasks: async (req, res) => {
    try {
      const { status, priority, assignee } = req.query;
      let filteredTasks = tasks;

      // Apply filters
      if (status) {
        filteredTasks = filteredTasks.filter(task => task.status === status);
      }
      if (priority) {
        filteredTasks = filteredTasks.filter(task => task.priority === priority);
      }
      if (assignee) {
        filteredTasks = filteredTasks.filter(task => task.assignee === parseInt(assignee));
      }

      // Calculate statistics
      const stats = {
        total: tasks.length,
        todo: tasks.filter(t => t.status === 'todo').length,
        inProgress: tasks.filter(t => t.status === 'in-progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        overdue: tasks.filter(t => t.status !== 'completed' && new Date(t.deadline) < new Date()).length
      };

      res.json({
        success: true,
        data: filteredTasks,
        stats,
        count: filteredTasks.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching tasks',
        error: error.message
      });
    }
  },

  // Update task status
  updateTaskStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['todo', 'in-progress', 'completed'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be: todo, in-progress, or completed'
        });
      }

      const taskIndex = tasks.findIndex(t => t.id === parseInt(id));
      if (taskIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      tasks[taskIndex].status = status;
      tasks[taskIndex].updatedAt = new Date().toISOString();

      res.json({
        success: true,
        data: tasks[taskIndex],
        message: 'Task status updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating task status',
        error: error.message
      });
    }
  }
};

module.exports = taskController;
