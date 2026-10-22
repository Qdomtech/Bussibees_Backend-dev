const SkillBundle = require("../models/skillbundleModule");
const BuyBundle = require("../models/BuyBundlesModels");
const BundleStatus = require("../models/BundleStatus");
const EbookStatus = require("../models/ebookStatus");
const LectureStatus = require("../models/lectureStatus");
const SkillWallet = require("../models/skillwallet");
const User = require("../models/user");
const axios = require("axios");
const qs = require("qs");

const mongoose = require("mongoose");

const parseSkillCourseIds = (input) => {
  if (!input) return [];

  let parsed = input;

  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch (err) {
      parsed = [parsed];
    }
  }

  if (!Array.isArray(parsed)) {
    parsed = [parsed];
  }

  parsed = parsed.flatMap((id) => {
    if (typeof id === "string" && id.startsWith("[")) {
      try {
        return JSON.parse(id);
      } catch {
        return id;
      }
    }
    return id;
  });

  return parsed;
};


exports.createSkillBundle = async (req, res) => {
  try {
    let { BundleName, SkillCourseId, tagline, description, price } = req.body;

    if (!BundleName) {
      return res.status(400).json({
        success: false,
        message: "BundleName is required",
      });
    }

    if (!SkillCourseId) {
      return res.status(400).json({
        success: false,
        message: "SkillCourseId is required",
      });
    }

    const courseIds = parseSkillCourseIds(SkillCourseId);
    let bundleImage = null;
    if (req.files && req.files.length > 0) {
      const file = req.files.find(
        (file) => file.fieldname === "BundleImages"
      );
      if (file) {
        bundleImage = file.location || file.path;
      }
    }

    const newBundle = await SkillBundle.create({
      BundleName,
      tagline,
      description,
      price,
      BundleImages: bundleImage,
      SkillCourseId: courseIds,
    });

    return res.status(201).json({
      success: true,
      message: "Skill Bundle created successfully",
      data: newBundle,
    });

  } catch (error) {
    console.error("Create SkillBundle Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.getAllSkillBundles = async (req, res) => {
  try {
    const bundles = await SkillBundle.find()
      .populate("SkillCourseId", "lectures")
      .sort({ createdAt: -1 })
      .lean();
    const updatedBundles = bundles.map((bundle) => {
      let totalMinutes = 0;
      bundle.SkillCourseId.forEach((course) => {
        course.lectures?.forEach((lecture) => {
          if (lecture.time) {
            const minutes = parseInt(lecture.time.replace(/\D/g, ""));
            if (!isNaN(minutes)) {
              totalMinutes += minutes;
            }
          }
        });
      });
      const { BundleImages, ...rest } = bundle;
      return {
        ...rest,
        SkillCourseId: bundle.SkillCourseId.map(course => course._id),
        TimeInMinutes: totalMinutes,
        TimeInHours: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`,
      };
    });

    return res.status(200).json({
      success: true,
      count: updatedBundles.length,
      data: updatedBundles,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// exports.UserBundles = async (req, res) => {
//   try {
//     const userId = req.user?.id;

//     const bundles = await SkillBundle.find()
//       .populate("SkillCourseId", "lectures")
//       .sort({ createdAt: 1 })
//       .lean();

//     let highestPurchasedIndex = -1;
//     let lastPurchasedPrice = 0;

//     if (userId) {
//       const purchasedBundles = await BuyBundle.find({
//         userId,
//         paymentStatus: true,
//       }).select("BundleId");

//       const purchasedIds = purchasedBundles.map(item =>
//         item.BundleId.toString()
//       );

//       bundles.forEach((bundle, index) => {
//         if (purchasedIds.includes(bundle._id.toString())) {
//           if (index > highestPurchasedIndex) {
//             highestPurchasedIndex = index;
//             lastPurchasedPrice = bundle.price;
//           }
//         }
//       });
//     }

//     const updatedBundles = bundles.map((bundle, index) => {
//       let totalMinutes = 0;

//       bundle.SkillCourseId.forEach((course) => {
//         course.lectures?.forEach((lecture) => {
//           if (lecture.time) {
//             const minutes = parseInt(lecture.time.replace(/\D/g, ""));
//             if (!isNaN(minutes)) {
//               totalMinutes += minutes;
//             }
//           }
//         });
//       });

//       let discountPrice = 0;

//       if (highestPurchasedIndex !== -1 && index > highestPurchasedIndex) {
//         discountPrice = lastPurchasedPrice;
//       }
//       let names;
//       if (index > 0) {
//         const previousNames = bundles
//           .slice(0, index)
//           .map(b => b.BundleName)
//           .join(", ");
//         names = previousNames;
//       }

//       const responseData = {
//         ...bundle,
//         SkillCourseId: bundle.SkillCourseId.map(course => course._id),
//         TimeInMinutes: totalMinutes,
//         TimeInHours: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`,
//         status: index <= highestPurchasedIndex,
//         discountPrice: discountPrice,
//       };

//       if (index > 0) {
//         responseData.names = names;
//       }

//       return responseData;
//     });

//     return res.status(200).json({
//       success: true,
//       count: updatedBundles.length,
//       data: updatedBundles,
//     });

//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };





// exports.UserBundles = async (req, res) => {
//   try {
//     const userId = req.user?.id;
//     const bundles = await SkillBundle.find()
//       .populate("SkillCourseId", "lectures")
//       .sort({ createdAt: 1 })
//       .lean();

//     let highestPurchasedIndex = -1;
//     let lastPurchasedPrice = 0;

//     if (userId) {
//       const purchasedBundles = await BuyBundle.find({
//         userId,
//         paymentStatus: true,
//       }).select("BundleId");

//       const purchasedIds = purchasedBundles.map(item =>
//         item.BundleId.toString()
//       );

//       bundles.forEach((bundle, index) => {
//         if (purchasedIds.includes(bundle._id.toString())) {
//           if (index > highestPurchasedIndex) {
//             highestPurchasedIndex = index;
//             lastPurchasedPrice = bundle.price;
//           }
//         }
//       });
//     }

//     const updatedBundles = bundles.map((bundle, index) => {
//       let totalMinutes = 0;

//       bundle.SkillCourseId.forEach((course) => {
//         course.lectures?.forEach((lecture) => {
//           if (lecture.time) {
//             const minutes = parseInt(
//               lecture.time.toString().replace(/\D/g, "")
//             );
//             if (!isNaN(minutes)) {
//               totalMinutes += minutes;
//             }
//           }
//         });
//       });

//       let discountPrice = 0;
//       let status = "Buy";
//       if (highestPurchasedIndex !== -1) {
//         if (index <= highestPurchasedIndex) {
//           status = "Activated";
//         } else {
//           status = "Upgrade";
//           discountPrice = lastPurchasedPrice;
//         }
//       }

//       let names;
//       if (index > 0) {
//         const previousNames = bundles
//           .slice(0, index)
//           .map(b => b.BundleName)
//           .join(", ");
//         names = previousNames;
//       }

//       const responseData = {
//         ...bundle,
//         SkillCourseId: bundle.SkillCourseId.map(course => course._id),
//         TimeInMinutes: totalMinutes,
//         TimeInHours: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`,
//         status,
//         discountPrice,
//       };

//       if (index > 0) {
//         responseData.names = names;
//       }

//       return responseData;
//     });

//     return res.status(200).json({
//       success: true,
//       count: updatedBundles.length,
//       data: updatedBundles,
//     });

//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };



exports.UserBundles = async (req, res) => {
  try {
    const userId = req.user?.id;

    const bundles = await SkillBundle.find()
      .populate("SkillCourseId", "lectures")
      .sort({ createdAt: 1 })
      .lean();

    let highestPurchasedIndex = -1;
    let lastPurchasedPrice = 0;

    if (userId) {
      const purchasedBundles = await BuyBundle.find({
        userId,
        paymentStatus:"SUCCESS",
      }).select("BundleId");

      const purchasedIds = purchasedBundles.map(item =>
        item.BundleId.toString()
      );

      bundles.forEach((bundle, index) => {
        if (purchasedIds.includes(bundle._id.toString())) {
          if (index > highestPurchasedIndex) {
            highestPurchasedIndex = index;
            lastPurchasedPrice = bundle.price;
          }
        }
      });
    }

    const updatedBundles = [];

    for (let index = 0; index < bundles.length; index++) {

      const bundle = bundles[index];
      let totalMinutes = 0;

      bundle.SkillCourseId.forEach((course) => {
        course.lectures?.forEach((lecture) => {
          if (lecture.time) {
            const minutes = parseInt(
              lecture.time.toString().replace(/\D/g, "")
            );
            if (!isNaN(minutes)) {
              totalMinutes += minutes;
            }
          }
        });
      });

      let discountPrice = 0;
      let status = "Buy";

      if (highestPurchasedIndex >= 0) {
        if (index <= highestPurchasedIndex) {
          status = "Activated";
        } else {
          status = "Upgrade";
          discountPrice = lastPurchasedPrice;
        }
      }

      if (userId) {
        await BundleStatus.findOneAndUpdate(
          { BundleId: bundle._id, userId: userId },
          { Status: status },
          { upsert: true, new: true }
        );
      }

      let names;
      if (index > 0) {
        const previousNames = bundles
          .slice(0, index)
          .map(b => b.BundleName)
          .join(", ");
        names = previousNames;
      }

      const responseData = {
        ...bundle,
        SkillCourseId: bundle.SkillCourseId.map(course => course._id),
        TimeInMinutes: totalMinutes,
        TimeInHours: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`,
        status,
        discountPrice,
      };

      if (index > 0) {
        responseData.names = names;
      }

      updatedBundles.push(responseData);
    }

    return res.status(200).json({
      success: true,
      count: updatedBundles.length,
      data: updatedBundles,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



exports.SingleSkillBundle = async (req, res) => {
  try {
    const { id } = req.params;

    const bundle = await SkillBundle.findById(id).lean();

    if (!bundle) {
      return res.status(404).json({
        success: false,
        message: "Skill Bundle not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: bundle,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.UserBundlesBuId = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const bundle = await SkillBundle.findById(id)
      .populate("SkillCourseId", "SkillName SkillcourseImages lectures")
      .lean();
    if (!bundle) {
      return res.status(404).json({
        success: false,
        message: "Skill Bundle not found",
      });
    }

    let totalMinutes = 0;

    bundle.SkillCourseId.forEach((course) => {
      if (course.lectures && course.lectures.length > 0) {
        course.lectures.forEach((lecture) => {
          if (lecture.time) {
            const minutes = parseInt(
              lecture.time.toString().replace(/\D/g, "")
            );
            if (!isNaN(minutes)) {
              totalMinutes += minutes;
            }
          }
        });
      }
      delete course.lectures;
    });

    let status = "Buy";

    if (userId) {
      const bundleStatus = await BundleStatus.findOne({
        BundleId: id,
        userId: userId,
      }).lean();

      if (bundleStatus) {
        status = bundleStatus.Status;
      }
    }

    const updatedBundle = {
      ...bundle,
      TimeInMinutes: totalMinutes,
      TimeInHours: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`,
      status,
    };

    return res.status(200).json({
      success: true,
      data: updatedBundle,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.updateSkillBundle = async (req, res) => {
  try {
    const { id } = req.params;
    const { BundleName, SkillCourseId, tagline, description, price } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Bundle ID is required",
      });
    }

    const bundle = await SkillBundle.findById(id);
    if (!bundle) {
      return res.status(404).json({
        success: false,
        message: "Skill Bundle not found",
      });
    }
    let finalImage = bundle.BundleImages;

    if (req.file) {
      console.log("New File Uploaded:", req.file);
      finalImage = req.file.location || req.file.path;
    } 
    else if (req.body.BundleImages !== undefined) {
      finalImage = req.body.BundleImages;
    }

    bundle.BundleImages = finalImage;
    if (SkillCourseId) {
      const courseIds = parseSkillCourseIds(SkillCourseId);
      bundle.SkillCourseId = courseIds;
    }
    if (BundleName !== undefined) bundle.BundleName = BundleName;
    if (tagline !== undefined) bundle.tagline = tagline;
    if (description !== undefined) bundle.description = description;
    if (price !== undefined) bundle.price = price;

    await bundle.save();

    return res.status(200).json({
      success: true,
      message: "Skill Bundle updated successfully",
      data: bundle,
    });

  } catch (error) {
    console.error("Update SkillBundle Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



exports.deleteSkillBundle = async (req, res) => {
  try {
    const { id } = req.params;

    const bundle = await SkillBundle.findById(id);

    if (!bundle) {
      return res.status(404).json({
        success: false,
        message: "Skill Bundle not found",
      });
    }

    await SkillBundle.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Skill Bundle deleted successfully",
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



let phonePeToken = null;
let phonePeTokenExpiry = null;

const getPhonePeToken = async () => {
  if (phonePeToken && phonePeTokenExpiry > Date.now()) {
    return phonePeToken;
  }

  const payload = qs.stringify({
    client_id: process.env.PHONEPAY_CLIENT_ID,
    client_secret: process.env.PHONEPAY_CLIENT_SECRET,
    client_version: process.env.PHONEPAY_CLIENT_VERSION,
    grant_type: "client_credentials",
  });

  const response = await axios.post(
    `${process.env.PHONEPAY_BASE_URL}/v1/oauth/token`,
    payload,
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  phonePeToken = response.data.access_token;
  phonePeTokenExpiry =
    Date.now() + (response.data.expires_in - 60) * 1000;

  return phonePeToken;
};


// exports.buyBundlePayment = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { BundleId, amount } = req.body;

//     if (!BundleId || !amount) {
//       return res.status(400).json({
//         success: false,
//         message: "BundleId and amount are required",
//       });
//     }

//     const bundle = await SkillBundle.findById(BundleId);
//     if (!bundle) {
//       return res.status(404).json({
//         success: false,
//         message: "Bundle not found",
//       });
//     }

//     const alreadyPurchased = await BuyBundle.findOne({
//       userId,
//       BundleId,
//       paymentStatus: "SUCCESS",
//     });

//     if (alreadyPurchased) {
//       return res.status(400).json({
//         success: false,
//         message: "You already purchased this bundle",
//       });
//     }

//     const merchantOrderId =
//       "ORDER_" + Date.now() + "_" + userId.toString().slice(-4);

//     const transactionId =
//       "TXN_" + Math.floor(100000000 + Math.random() * 900000000);

//     const purchase = await BuyBundle.create({
//       userId,
//       BundleId,
//       amount,
//       merchantOrderId,
//       transactionId,
//       paymentStatus: "SUCCESS",
//       paymentMode: "TestMode",
//     });

    
//     const buyer = await User.findById(userId);

//     if (buyer?.Userskillreferid?.length > 0) {

//       const referrerId = buyer.Userskillreferid[0];
//       let wallet = await SkillWallet.findOne({ userId: referrerId });

//       const commissionAlreadyGiven = wallet?.transactions?.find(
//         txn =>
//           txn.buyerId?.toString() === userId.toString() &&
//           txn.bundleId?.toString() === BundleId.toString()
//       );

//       if (!commissionAlreadyGiven) {

//         const referrerPurchases = await BuyBundle.find({
//           userId: referrerId,
//           paymentStatus: "SUCCESS",
//         }).populate("BundleId");

//         if (referrerPurchases.length > 0) {

//           const sortedBundles = referrerPurchases.sort((a, b) => {
//             return new Date(b.BundleId.createdAt) - new Date(a.BundleId.createdAt);
//           });

//           const referrerHighestBundle = sortedBundles[0].BundleId;

//           if (bundle.createdAt <= referrerHighestBundle.createdAt) {

//             const commission = amount * 0.10;

//             if (!wallet) {
//               wallet = await SkillWallet.create({
//                 userId: referrerId,
//                 balance: 0,
//                 transactions: [],
//               });
//             }

//             wallet.balance += commission;

//             wallet.transactions.push({
//               amount: commission,
//               type: "credit",
//               message: `10% commission from user ${buyer._id}`,
//               buyerId: userId,
//               bundleId: BundleId,
//             });

//             await wallet.save();
//           }
//         }
//       }
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Bundle purchased successfully",
//       data: purchase,
//     });

//   } catch (error) {
//     console.error("Buy Bundle Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };

exports.buyBundlePayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { BundleId } = req.body;

    if (!BundleId) {
      return res.status(400).json({
        success: false,
        message: "BundleId is required",
      });
    }

    const bundle = await SkillBundle.findById(BundleId);
    if (!bundle) {
      return res.status(404).json({
        success: false,
        message: "Bundle not found",
      });
    }

    const amount = bundle.price;

    const alreadyPurchased = await BuyBundle.findOne({
      userId,
      BundleId,
      paymentStatus: "SUCCESS",
    });

    if (alreadyPurchased) {
      return res.status(400).json({
        success: false,
        message: "You already purchased this bundle",
      });
    }

    const merchantOrderId =
      "ORDER_" + Date.now() + "_" + userId.toString().slice(-4);

    const transactionId =
      "TXN_" + Math.floor(100000000 + Math.random() * 900000000);

    const purchase = await BuyBundle.create({
      userId,
      BundleId,
      amount,
      merchantOrderId,
      transactionId,
      paymentStatus: "SUCCESS",
      paymentMode: "TestMode",
    });

    const buyer = await User.findById(userId);

    // commission percentages for 4 levels
    const commissionLevels = [0.10, 0.07, 0.05, 0.03];

    let currentUser = buyer;

    for (let level = 0; level < 4; level++) {

      if (!currentUser?.Userskillreferid?.length) break;

      const referrerId = currentUser.Userskillreferid[0];

      const referrer = await User.findById(referrerId);

      if (!referrer) break;

      let wallet = await SkillWallet.findOne({ userId: referrerId });

      const commissionAlreadyGiven = wallet?.transactions?.find(
        (txn) =>
          txn.buyerId?.toString() === userId.toString() &&
          txn.bundleId?.toString() === BundleId.toString() &&
          txn.level === level + 1
      );

      if (!alreadyGiven) {

        const referrerPurchases = await BuyBundle.find({
          userId: referrerId,
          paymentStatus: "SUCCESS",
        }).populate("BundleId");

        if (referrerPurchases.length > 0) {

          const sortedBundles = referrerPurchases.sort((a, b) => {
            return (
              new Date(b.BundleId.createdAt) -
              new Date(a.BundleId.createdAt)
            );
          });

          const referrerHighestBundle = sortedBundles[0].BundleId;

          if (bundle.createdAt <= referrerHighestBundle.createdAt) {

            const commission = amount * commissionLevels[level];

            if (!wallet) {
              wallet = await SkillWallet.create({
                userId: referrerId,
                balance: 0,
                transactions: [],
              });
            }

            wallet.balance += commission;

            wallet.transactions.push({
              amount: commission,
              type: "credit",
              message: `${commissionLevels[level] * 100}% commission from user ${buyer._id}`,
              buyerId: userId,
              bundleId: BundleId,
            });

            await wallet.save();
          }
        }

        wallet.balance += commissionAmount;

        wallet.transactions.push({
          amount: commissionAmount,
          type: "credit",
          message: `Level ${level + 1} referral commission`,
          buyerId: userId,
          bundleId: BundleId,
          level: level + 1,
        });

        await wallet.save();
      }

      currentUser = referrer;
    }

    return res.status(200).json({
      success: true,
      message: "Bundle purchased successfully",
      data: purchase,
    });

  } catch (error) {
    console.error("Buy Bundle Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


exports.getMyReferrerDetails = async (req, res) => {
  try {
    const userId = req.user.id;

    const referredUsers = await User.find({
      Userskillreferid: userId,
    }).select("firstName middleName lastName");

    const wallet = await SkillWallet.findOne({ userId }).populate({
      path: "transactions.bundleId",
      select: "BundleName price",
    });

    if (!referredUsers.length) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const result = referredUsers.map((user) => {
      let status = "Active";
      let bundleName = null;
      let bundlePrice = null;
      let commissionAmount = null;

      if (wallet?.transactions?.length > 0) {
        const userTransactions = wallet.transactions.filter(
          (txn) => txn.buyerId?.toString() === user._id.toString()
        );

        if (userTransactions.length > 0) {
          status = "Purchased";

          const latestTxn =
            userTransactions[userTransactions.length - 1];

          bundleName = latestTxn.bundleId?.BundleName || null;
          bundlePrice = latestTxn.bundleId?.price || null;
          commissionAmount = latestTxn.amount || 0;
        }
      }

      const fullName = [
        user.firstName,
        user.middleName,
        user.lastName,
      ]
        .filter(Boolean) 
        .join(" ");

      return {
        userId: user._id,
        name: fullName,  
        status,
        bundleName,
        bundlePrice,
        commissionAmount,
      };
    });

    return res.status(200).json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error("Referral Reverse Check Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.MyReferrerDetails = async (req, res) => {
  try {
    const userId = req.user.id;

    const wallet = await SkillWallet.findOne({ userId }).populate({
      path: "transactions.bundleId",
      select: "BundleName price",
    });
    const getReferralTree = async (referrerId, level = 1) => {
      if (level > 4) return [];

      const users = await User.find({
        Userskillreferid: referrerId,
      }).select("firstName middleName lastName");

      const result = [];

      for (const user of users) {
        let status = "Active";
        let bundleName = null;
        let bundlePrice = null;
        let commissionAmount = null;

        if (wallet?.transactions?.length > 0) {
          const userTransactions = wallet.transactions.filter(
            (txn) => txn.buyerId?.toString() === user._id.toString()
          );

          if (userTransactions.length > 0) {
            status = "Purchased";

            const latestTxn =
              userTransactions[userTransactions.length - 1];

            bundleName = latestTxn.bundleId?.BundleName || null;
            bundlePrice = latestTxn.bundleId?.price || null;
            commissionAmount = latestTxn.amount || 0;
          }
        }

        const fullName = [
          user.firstName,
          user.middleName,
          user.lastName,
        ]
          .filter(Boolean)
          .join(" ");

        const children = await getReferralTree(user._id, level + 1);

        result.push({
          userId: user._id,
          name: fullName,
          level,
          status,
          bundleName,
          bundlePrice,
          commissionAmount,
          children, 
        });
      }

      return result;
    };

    const referralTree = await getReferralTree(userId, 1);

    return res.status(200).json({
      success: true,
      totalTeam: referralTree.length,
      data: referralTree,
    });
  } catch (error) {
    console.error("Referral Tree Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// exports.getMySkillWallet = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const wallet = await SkillWallet.findOne({ userId });

//     if (!wallet) {
//       return res.status(200).json({
//         success: true,
//         data: {
//           balance: 0,
//           totalCommission: 0,
//           totalUsers: 0,
//         },
//       });
//     }
//     const creditTransactions = wallet.transactions.filter(
//       txn => txn.type === "credit"
//     );
//     const totalCommission = creditTransactions.reduce(
//       (sum, txn) => sum + txn.amount,
//       0
//     );
//     const uniqueUsers = [
//       ...new Set(
//         creditTransactions
//           .filter(txn => txn.buyerId)
//           .map(txn => txn.buyerId.toString())
//       ),
//     ];

//     return res.status(200).json({
//       success: true,
//       data: {
//         balance: wallet.balance,
//         totalCommission: totalCommission,
//         totalUsers: uniqueUsers.length,
//       },
//     });

//   } catch (error) {
//     console.error("Get Wallet Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };


exports.getMySkillWallet = async (req, res) => {
  try {
    const userId = req.user.id;

    const wallet = await SkillWallet.findOne({ userId });

    let balance = 0;
    let totalCommission = 0;
    let totalUsers = 0;
    let totalCourses = 0;   

    if (wallet) {
      const creditTransactions = wallet.transactions.filter(
        txn => txn.type === "credit"
      );

      totalCommission = creditTransactions.reduce(
        (sum, txn) => sum + txn.amount,
        0
      );

      const uniqueUsers = [
        ...new Set(
          creditTransactions
            .filter(txn => txn.buyerId)
            .map(txn => txn.buyerId.toString())
        ),
      ];

      balance = wallet.balance;
      totalUsers = uniqueUsers.length;
    }

    const latestPurchase = await BuyBundle.findOne({
      userId,
      paymentStatus: "SUCCESS",
    })
      .sort({ createdAt: -1 })
      .populate({
        path: "BundleId",
        select: "name SkillCourseId",
      });

    if (latestPurchase && latestPurchase.BundleId) {
      totalCourses =
        latestPurchase.BundleId.SkillCourseId?.length || 0;
    }

    return res.status(200).json({
      success: true,
      data: {
        balance,
        totalCommission,
        totalUsers,
        totalCourses,
      },
    });

  } catch (error) {
    console.error("Get Wallet Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// exports.buyBundlePayment = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { BundleId, amount } = req.body;

//     if (!BundleId || !amount || amount <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: "BundleId and valid amount are required",
//       });
//     }

//     const bundle = await SkillBundle.findById(BundleId);
//     if (!bundle) {
//       return res.status(404).json({
//         success: false,
//         message: "Bundle not found",
//       });
//     }

//     const alreadyPurchased = await BuyBundle.findOne({
//       userId,
//       BundleId,
//       paymentStatus: true,
//     });

//     if (alreadyPurchased) {
//       return res.status(400).json({
//         success: false,
//         message: "You have already purchased this bundle",
//       });
//     }

//     const merchantOrderId = `BUNDLE_${Date.now()}`;
//     const token = await getPhonePeToken();

//     const payload = {
//       merchantOrderId,
//       amount: amount * 100, 
//       paymentFlow: {
//         type: "PG_CHECKOUT",
//         message: "Bundle purchase payment",
//         merchantUrls: {
//           redirectUrl: `${req.get("referer")}payment-redirect/${merchantOrderId}?type=bundle`,
//         },
//       },
//     };

//     const response = await axios.post(
//       `${process.env.PHONEPAY_BASE_URL}/checkout/v2/pay`,
//       payload,
//       {
//         headers: {
//           Authorization: `O-Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

   
//     await BuyBundle.create({
//       userId,
//       BundleId,
//       merchantOrderId,
//       amount: amount * 100,
//       displayAmount: amount,
//       paymentFor: "BUNDLE",
//       status: "PENDING",
//       rawResponse: response.data,
//     });

//     return res.json({
//       success: true,
//       redirectUrl: response.data.redirectUrl,
//       merchantOrderId,
//     });

//   } catch (error) {
//     console.error("Bundle Payment Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };



exports.MyPurchasedBundle = async (req, res) => {
  try {
    const userId = req.user.id;
    const purchasedBundles = await BuyBundle.find({
      userId,
      paymentStatus: "SUCCESS",
    })
      .sort({ createdAt: -1 })
      .select("BundleId");
    if (!purchasedBundles.length) {
      return res.status(404).json({
        success: false,
        message: "No purchased bundles found for this user",
      });
    }
    const bundleIds = purchasedBundles.map(item => item.BundleId);
    const bundles = await SkillBundle.find({
      _id: { $in: bundleIds },
    })
      .populate({
        path: "SkillCourseId",
        select: "SkillName SkillcourseImages",
      })
      .select("BundleName SkillCourseId")
      .lean();
    const courseMap = new Map();
    for (const bundle of bundles) {
      for (const course of bundle.SkillCourseId) {
        const courseId = course._id.toString();
        if (!courseMap.has(courseId)) {
          const ebookStatus = await EbookStatus.findOne({
            CourseId: course._id,
            BundleId: bundle._id,
            userId: userId,
            isReadEbook: true
          });

          let status = 0;
          if (ebookStatus) {
            status += 20;
          }

          courseMap.set(courseId, {
            ...course,
            bundle: {
              bundleId: bundle._id,
              bundleName: bundle.BundleName,
            },
            status 
          });
        }
      }
    }

    const uniqueCourses = Array.from(courseMap.values());

    return res.status(200).json({
      success: true,
      totalCourses: uniqueCourses.length,
      data: uniqueCourses,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// exports.MyPurchasedBundleById = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user?.id; 

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid Course ID",
//       });
//     }

//     const bundle = await SkillBundle.findOne({
//       SkillCourseId: id,
//     })
//       .populate({
//         path: "SkillCourseId",
//         match: { _id: id },
//         select: "SkillName SkillcourseImages ebook lectures assessment",
//       })
//       .lean();

//     if (!bundle || !bundle.SkillCourseId.length) {
//       return res.status(404).json({
//         success: false,
//         message: "Course not found in any bundle",
//       });
//     }

//     let course = bundle.SkillCourseId[0];

//     let isReadEbook = false;

//     if (userId) {
//       const ebookStatus = await EbookStatus.findOne({
//         CourseId: id,
//         userId,
//         isReadEbook: true,
//       });

//       if (ebookStatus) {
//         isReadEbook = true;
//       }
//     }

//     course = {
//       ...course,
//       isReadEbook,
//     };

//     return res.status(200).json({
//       success: true,
//       data: course,
//     });

//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };



exports.MyPurchasedBundleById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Course ID",
      });
    }

    const purchasedBundles = await BuyBundle.find({
      userId,
      paymentStatus: "SUCCESS",
    }).select("BundleId");

    const bundleIds = purchasedBundles.map(b => b.BundleId);

    if (!bundleIds.length) {
      return res.status(404).json({
        success: false,
        message: "No purchased bundles found",
      });
    }

    const bundle = await SkillBundle.findOne({
      _id: { $in: bundleIds },
      SkillCourseId: id,
    })
      .populate({
        path: "SkillCourseId",
        match: { _id: id },
        select: "SkillName SkillcourseImages ebook lectures assessment",
      })
      .lean();

    if (!bundle || !bundle.SkillCourseId.length) {
      return res.status(404).json({
        success: false,
        message: "Course not found in purchased bundles",
      });
    }

    let course = bundle.SkillCourseId[0];

    // ================= EBOOK STATUS =================
    let isReadEbook = false;

    const ebookStatus = await EbookStatus.findOne({
      CourseId: id,
      BundleId: bundle._id,
      userId,
      isReadEbook: true,
    });

    if (ebookStatus) {
      isReadEbook = true;
    }

    // ================= LECTURE STATUS =================
    let updatedLectures = [];

    if (course.lectures && course.lectures.length > 0) {
      const lectureIds = course.lectures.map(l => l._id);

      const lectureStatuses = await LectureStatus.find({
        CourseId: id,
        BundleId: bundle._id,
        userId,
        LectureId: { $in: lectureIds },
        isReadLecture: true,
      });

      const readLectureIds = lectureStatuses.map(ls =>
        ls.LectureId.toString()
      );

      updatedLectures = course.lectures.map(lecture => ({
        ...lecture,
        isReadLecture: readLectureIds.includes(
          lecture._id.toString()
        ),
      }));
    }

    course = {
      ...course,
      lectures: updatedLectures,
      bundle: {
        bundleId: bundle._id,
        bundleName: bundle.BundleName,
      },
      isReadEbook,
    };

    return res.status(200).json({
      success: true,
      data: course,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.phonePeWebhook = async (req, res) => {
  try {
    console.log("========== PHONEPE WEBHOOK HIT ==========");
    console.log("Headers:", req.headers);
    console.log("Raw Body:", req.body);

    let parsedBody;

    if (typeof req.body === "string") {
      try {
        parsedBody = JSON.parse(req.body);
        console.log("Parsed JSON Body:", parsedBody);
      } catch (err) {
        console.log("Body is not valid JSON");
        parsedBody = {};
      }
    } else {
      parsedBody = req.body;
    }

    const payload = parsedBody?.payload || parsedBody || {};

    console.log("Final Payload Used:", payload);

    const merchantOrderId =
      payload.merchantOrderId ||
      payload.orderId ||
      payload.merchantTransactionId;

    console.log("merchantOrderId:", merchantOrderId);

    if (!merchantOrderId) {
      console.log("No merchantOrderId found");
      return res.status(200).send("OK");
    }

    const payment = await BuyBundle.findOneAndUpdate(
      { merchantOrderId },
      { paymentStatus: payload.state || "UNKNOWN" },
      { new: true }
    );

    console.log("Updated Payment:", payment);

    if (payload.state === "COMPLETED" && payment) {
      console.log("Payment COMPLETED");

      if (payment.BundleId) {
        console.log("Creating successful BuyBundle entry");

        await BuyBundle.updateOne(
          { merchantOrderId },
          { paymentStatus: "COMPLETED" }
        );
      }
    }

    console.log("========== WEBHOOK END ==========");

    return res.status(200).send("OK");

  } catch (error) {
    console.error("WEBHOOK ERROR:", error);
    return res.status(200).send("OK");
  }
};

exports.checkPaymentStatus = async (req, res) => {
  try {
    const { merchantOrderId } = req.params;
    if (!merchantOrderId) {
      return res.status(400).json({
        success: false,
        message: "merchantOrderId is required",
      });
    }
    const payment = await BuyBundle.findOne({ merchantOrderId });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const transactionId =
      payment.rawResponse?.orderId ||
      payment.rawResponse?.fullPayload?.orderId ||
      null;

    return res.json({
      success: true,
      status: payment.paymentStatus,
      transactionId,
      amount: payment.displayAmount,
      paymentFor: payment.paymentFor,
    });
  } catch (err) {
    console.error("CHECK PAYMENT STATUS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// exports.MyPurchasedBundleById = async (req, res) => {
//   try {
//     const { id } = req.params; 
//     const userId = req.user?.id;

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid Course ID",
//       });
//     }

//     // 1️⃣ Get latest purchased bundles of user
//     const purchasedBundles = await BuyBundle.find({
//       userId,
//       paymentStatus: true,
//     })
//       .sort({ createdAt: -1 }) // latest first
//       .select("BundleId");

//     if (!purchasedBundles.length) {
//       return res.status(404).json({
//         success: false,
//         message: "No purchased bundles found",
//       });
//     }

//     const bundleIds = purchasedBundles.map(b => b.BundleId);

//     // 2️⃣ Find bundle that contains this course (latest purchased priority)
//     const bundle = await SkillBundle.findOne({
//       _id: { $in: bundleIds },
//       SkillCourseId: id,
//     })
//       .select("BundleName SkillCourseId")
//       .populate({
//         path: "SkillCourseId",
//         match: { _id: id },
//         select: "SkillName SkillcourseImages ebook lectures assessment",
//       })
//       .lean();

//     if (!bundle || !bundle.SkillCourseId || !bundle.SkillCourseId.length) {
//       return res.status(404).json({
//         success: false,
//         message: "Course not found in your purchased bundles",
//       });
//     }

//     let course = bundle.SkillCourseId[0];

//     // 3️⃣ Ebook Status (BundleId + CourseId + userId match)
//     const ebookStatus = await EbookStatus.findOne({
//       CourseId: id,
//       BundleId: bundle._id,
//       userId,
//       isReadEbook: true,
//     });

//     const isReadEbook = !!ebookStatus;

//     // 4️⃣ Lecture Status (BundleId + CourseId + userId match)
//     let lecturesWithStatus = course.lectures || [];

//     if (course.lectures?.length) {
//       const lectureIds = course.lectures.map(l => l._id);

//       const lectureStatuses = await LectureStatus.find({
//         CourseId: id,
//         BundleId: bundle._id,
//         userId,
//         LectureId: { $in: lectureIds },
//         isReadLecture: true,
//       }).lean();

//       const readLectureIds = lectureStatuses.map(
//         item => item.LectureId.toString()
//       );

//       lecturesWithStatus = course.lectures.map(lecture => ({
//         ...lecture,
//         isReadLecture: readLectureIds.includes(
//           lecture._id.toString()
//         ),
//       }));
//     }

//     // 5️⃣ Final Response Structure
//     course = {
//       ...course,
//       isReadEbook,
//       lectures: lecturesWithStatus,
//       bundle: {
//         bundleId: bundle._id,
//         bundleName: bundle.BundleName,
//       },
//     };

//     return res.status(200).json({
//       success: true,
//       data: course,
//     });

//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };


exports.MarkContentAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { CourseId, LectureId, BundleId, type } = req.body;

    if (!type || !["ebook", "lecture"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be 'ebook' or 'lecture'",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(CourseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Course ID",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(BundleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Bundle ID",
      });
    }
    if (type === "ebook") {
      const status = await EbookStatus.findOneAndUpdate(
        { CourseId, BundleId, userId },
        { 
          CourseId,
          BundleId,
          userId,
          isReadEbook: true 
        },
        { new: true, upsert: true }
      );

      return res.status(200).json({
        success: true,
        message: "Ebook marked as read",
        data: status,
      });
    }

    if (type === "lecture") {

      if (!LectureId || !mongoose.Types.ObjectId.isValid(LectureId)) {
        return res.status(400).json({
          success: false,
          message: "Valid LectureId is required for lecture type",
        });
      }

      const status = await LectureStatus.findOneAndUpdate(
        { CourseId, LectureId, BundleId, userId },
        { 
          CourseId,
          LectureId,
          BundleId,
          userId,
          isReadLecture: true 
        },
        { new: true, upsert: true }
      );

      return res.status(200).json({
        success: true,
        message: "Lecture marked as read",
        data: status,
      });
    }

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.getUserPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const payments = await BuyBundle.find({ userId })
      .populate("BundleId", "BundleName price")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });

  } catch (error) {
    console.error("Payment History Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


//   try {
//     const userId = req.user.id;
//     const { BundleId, amount } = req.body;

//     if (!BundleId || !amount) {
//       return res.status(400).json({
//         success: false,
//         message: "BundleId and amount are required",
//       });
//     }

//     const bundle = await SkillBundle.findById(BundleId);
//     if (!bundle) {
//       return res.status(404).json({
//         success: false,
//         message: "Bundle not found",
//       });
//     }

//     const alreadyPurchased = await BuyBundle.findOne({
//       userId,
//       BundleId,
//       paymentStatus: "true",
//     });

//     if (alreadyPurchased) {
//       return res.status(400).json({
//         success: false,
//         message: "You already purchased this bundle",
//       });
//     }

//     const purchase = await BuyBundle.create({
//       userId,
//       BundleId,
//       amount,
//       paymentStatus: "true",
//     });
//     const buyer = await User.findById(userId);

//     if (buyer?.Userskillreferid?.length > 0) {

//       const referrerId = buyer.Userskillreferid[0];

//       let wallet = await SkillWallet.findOne({ userId: referrerId });

//       const commissionAlreadyGiven = wallet?.transactions?.find(
//         txn => txn.buyerId?.toString() === userId.toString()
//       );

//       if (!commissionAlreadyGiven) {

//         const referrerPurchases = await BuyBundle.find({
//           userId: referrerId,
//           paymentStatus: "true"
//         }).populate("BundleId");

//         if (referrerPurchases.length > 0) {

//           const sortedBundles = referrerPurchases.sort((a, b) => {
//             return new Date(b.BundleId.createdAt) - new Date(a.BundleId.createdAt);
//           });

//           const referrerHighestBundle = sortedBundles[0].BundleId;
//           if (bundle.createdAt <= referrerHighestBundle.createdAt) {

//             const commission = amount * 0.10;

//             if (!wallet) {
//               wallet = await SkillWallet.create({
//                 userId: referrerId,
//                 balance: 0,
//                 transactions: [],
//               });
//             }

//             wallet.balance += commission;

//             wallet.transactions.push({
//               amount: commission,
//               type: "credit",
//               message: `10% commission from user ${buyer._id}`,
//               buyerId: userId,
//             });

//             await wallet.save();
//           }
//         }
//       }
//     }

//     res.status(200).json({
//       success: true,
//       message: "Bundle purchased successfully",
//       data: purchase,
//     });

//   } catch (error) {
//     console.error("Buy Bundle Error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };