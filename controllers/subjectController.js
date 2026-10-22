const Subject = require('../models/subject');


exports.createSubject = async (req, res) => {
  try {
    const { category, subcategory, name } = req.body;
  const createdBy = req.user._id;
    if (!category || !subcategory || !name) {
      return res.status(400).json({ message: 'Category, Subcategory, and name are required.' });
    }
    const newSubject = new Subject({ category, subcategory, name, createdBy });
    await newSubject.save();
    res.status(201).json({ message: 'Subject created successfully.', data: newSubject });
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error });
  }
};


exports.getAllSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find()
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('createdBy', 'name');
    res.status(200).json({ data: subjects });
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error });
  }
};


exports.getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('createdBy', 'name');

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found.' });
    }

    res.status(200).json({ data: subject });
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error });
  }
};


exports.updateSubject = async (req, res) => {
  try {
    const { category, subcategory, name } = req.body;
    const updated = await Subject.findByIdAndUpdate(
      req.params.id,
      { category, subcategory, name },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'name not found.' });
    }

    res.status(200).json({ message: 'Subject updated successfully.', data: updated });
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error });
  }
};


exports.deleteSubject = async (req, res) => {
  try {
    const deleted = await Subject.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: 'Subject not found.' });
    }

    res.status(200).json({ message: 'Subject deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error });
  }
};


exports.filterSubjectsByCategory = async (req, res) => {
  try {
    const { category, subcategory } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;

    const subjects = await Subject.find(filter).select('name');

    res.status(200).json({
      message: subjects.length === 0
        ? 'No data found or no match for category and subcategory.'
        : 'Subjects fetched successfully.',
      data: subjects
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error });
  }
};
