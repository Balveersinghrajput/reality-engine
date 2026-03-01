const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title:            { type: String, required: true, trim: true },
  description:      { type: String, default: '' },
  category:         { type: String, default: 'Other' },
  difficulty:       { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  estimatedMinutes: { type: Number, default: 30 },
  status:           { type: String, enum: ['pending', 'active', 'completed'], default: 'pending' },
  aiSuggested:      { type: Boolean, default: false },
  startedAt:        { type: Date },
  completedAt:      { type: Date },
  timeSpentSeconds: { type: Number },
  testScore:        { type: Number, min: 0, max: 100 },
}, { timestamps: true });

// Expose id as string
TaskSchema.set('toJSON', {
  transform(_, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.models.Task || mongoose.model('Task', TaskSchema);

