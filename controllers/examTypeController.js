
const ExamType = require('../models/examtype');

// exports.createExamtype = async (req, res) => {
//   try {
//     const { name, type, parentId } = req.body;

//     if (!name || !type) {
//       return res.status(400).json({ message: 'Name and type are required.' });
//     }

//     if (!['category', 'subcategory', 'subsubcategory'].includes(type)) {
//       return res.status(400).json({ message: 'Invalid Exam type.' });
//     }

    
//     if ((type === 'subcategory' || type === 'subsubcategory') && !parentId) {
//       return res.status(400).json({ message: 'Parent ID is required for subcategory and subsubcategory.' });
//     }

//     // Validate parent exists
//     if (parentId) {
//       const parent = await ExamType.findById(parentId);
//       if (!parent) {
//         return res.status(400).json({ message: 'Parent ExamType not found.' });
//       }

//       if (type === 'subcategory' && parent.type !== 'category') {
//         return res.status(400).json({ message: 'subcategory must belong to a category.' });
//       }

//       if (type === 'subsubcategory' && parent.type !== 'subcategory') {
//         return res.status(400).json({ message: 'subsubcategory must belong to a subcategory.' });
//       }
//     }

    
//     const existing = await ExamType.findOne({
//       name: name.trim(),
//       type,
//     });

//     if (existing) {
//       return res.status(409).json({ message: `${type.charAt(0).toUpperCase() + type.slice(1)} "${name}" already exists.` });
//     }

//     const newExamType = new ExamType({
//       name: name.trim(),
//       type,
//       parent: parentId || null,
//       createdBy: req.user._id,
//     });

//     await newExamType.save();

//     res.status(201).json({ message: 'ExamType created successfully.', exam: newExamType });
//   } catch (error) {
//     console.error('Error creating ExamType:', error);
//     res.status(500).json({ message: 'Server error while creating ExamType.' });
//   }
// };


exports.createExamtype = async (req, res) => {
  try {
    const { name, type, parentId } = req.body;

    if (!name || !type) {
      return res.status(400).json({ message: 'Name and type are required.' });
    }

    if (!['category', 'subcategory', 'subsubcategory'].includes(type)) {
      return res.status(400).json({ message: 'Invalid Exam type.' });
    }

    if ((type === 'subcategory' || type === 'subsubcategory') && !parentId) {
      return res.status(400).json({ message: 'Parent ID is required for subcategory and subsubcategory.' });
    }

    if (parentId) {
      const parent = await ExamType.findById(parentId);
      if (!parent) {
        return res.status(400).json({ message: 'Parent ExamType not found.' });
      }

      if (type === 'subcategory' && parent.type !== 'category') {
        return res.status(400).json({ message: 'subcategory must belong to a category.' });
      }

      if (type === 'subsubcategory' && parent.type !== 'subcategory') {
        return res.status(400).json({ message: 'subsubcategory must belong to a subcategory.' });
      }
    }


    const newExamType = new ExamType({
      name: name.trim(),
      type,
      parent: parentId || null,
      createdBy: req.user._id,
    });

    await newExamType.save();

    res.status(201).json({ message: 'ExamType created successfully.', exam: newExamType });
  } catch (error) {
    console.error('Error creating ExamType:', error);
    res.status(500).json({ message: 'Server error while creating ExamType.' });
  }
};


exports.getExamType = async (req, res) => {
  try {
    const { type, parentId } = req.query;

    if (!type) {
      return res.status(400).json({ message: 'Examtype is required.' });
    }

    if (!['category', 'subcategory', 'subsubcategory'].includes(type)) {
      return res.status(400).json({ message: 'Invalid ExamType Category.' });
    }

    const filter = { type };

    if ((type === 'subcategory' || type === 'subsubcategory') && parentId) {
      filter.parent = parentId;
    }

    const examType = await ExamType.find(filter).select('name type parent createdBy');

    res.status(200).json({ examType });
  } catch (error) {
    console.error('Error fetching ExamType:', error);
    res.status(500).json({ message: 'Server error while fetching ExamType.' });
  }
};




//  exports.deleteExamType = async (req, res) => {
//    try {
//      const { id } = req.params;
 
//      const ExamTypeToDelete = await ExamType.findById(id);
//      if (!ExamTypeToDelete) {
//        return res.status(404).json({ message: 'ExamType not found.' });
//      }
 
//      if (ExamTypeToDelete.type === 'subsubcategory') {
//        await ExamType.findByIdAndDelete(id);
//        return res.status(200).json({ message: 'subsubcategory deleted successfully.' });
//      }
 
//      if (ExamTypeToDelete.type === 'subcategory') {
       
//        const hasCities = await ExamType.exists({ parent: id, type: 'subsubcategory' });
//        if (hasCities) {
//          return res.status(400).json({ message: 'Cannot delete subcategory because it has subsubcategory.' });
//        }
 
      
//        await ExamType.findByIdAndDelete(id);
//        return res.status(200).json({ message: 'subcategory deleted successfully.' });
//      }
 
//      if (ExamTypeToDelete.type === 'category') {
      
//        const subcategorys = await ExamType.find({ parent: id, type: 'subcategory' });
 
//        if (subcategorys.length > 0) {
         
//          const subcategoryIds = subcategorys.map(s => s._id);
//          const cities = await ExamType.find({ parent: { $in: subcategoryIds }, type: 'subsubcategory' });
 
//          if (cities.length > 0) {
//            return res.status(400).json({ message: 'Cannot delete category because it has subcategorys and subsubcategory.' });
//          }
 
//          return res.status(400).json({ message: 'Cannot delete category because it has subcategorys.' });
//        }
 
//        await ExamType.findByIdAndDelete(id);
//        return res.status(200).json({ message: 'category deleted successfully.' });
//      }
 
//      res.status(400).json({ message: 'Invalid ExamType type.' });
 
//    } catch (error) {
//      console.error('Error deleting ExamType:', error);
//      res.status(500).json({ message: 'Server error while deleting ExamType.' });
//    }
//  };


exports.deleteExamType = async (req, res) => {
  try {
    const { id } = req.params;
    const examTypeToDelete = await ExamType.findById(id);
    if (!examTypeToDelete) {
      return res.status(404).json({ message: 'ExamType not found.' });
    }

    if (examTypeToDelete.type === 'subcategory') {
      await ExamType.findByIdAndDelete(id); 
      return res.status(200).json({ message: 'subcategory deleted successfully.' });
    }

    if (examTypeToDelete.type === 'category') {
      const hasSubcategories = await ExamType.exists({ parent: id, type: 'subcategory' });

      if (hasSubcategories) {
        return res.status(400).json({ message: 'Cannot delete category because it has subcategories.' });
      }

      await ExamType.findByIdAndDelete(id);
      return res.status(200).json({ message: 'category deleted successfully.' });
    }

    return res.status(400).json({ message: 'Invalid ExamType type.' });

  } catch (error) {
    console.error('Error deleting ExamType:', error);
    res.status(500).json({ message: 'Server error while deleting ExamType.' });
  }
};



 exports.updateExamType = async (req, res) => {
   try {
     const { id } = req.params;
     const { name, parentId } = req.body;
 
     const examTypeData = await ExamType.findById(id);
     if (!examTypeData) {
       return res.status(404).json({ message: 'ExamType not found.' });
     }
 
     if (parentId) {
       const parent = await ExamType.findById(parentId);
       if (!parent) {
         return res.status(400).json({ message: 'Parent examType not found.' });
       }
  

       if (examTypeData.type === 'subcategory' && parent.type !== 'category') {
         return res.status(400).json({ message: 'subcategory must belong to a category.' });
       }
 
       if (examTypeData.type === 'subsubcategory' && parent.type !== 'subcategory') {
         return res.status(400).json({ message: 'subsubcategory must belong to a subcategory.' });
       }
 
       examTypeData.parent = parentId;
     }
 
     if (name) {
       examTypeData.name = name;
     }
 
     await examTypeData.save();
 
     res.status(200).json({ message: 'ExamType updated successfully.', ExamType: examTypeData });
   } catch (error) {
     console.error('Error updating ExamType:', error);
     res.status(500).json({ message: 'Server error while updating ExamType.' });
   }
 };
 

 