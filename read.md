# BLCP Referral System Implementation Guide

## 1. Database Schema (MongoDB)
You'll need three key models:
- **User**: Stores users and their referral codes.
- **Order**: Stores purchases made using referral codes.
- **Product**: Stores product details with supplier pricing (visible only to referred customers).

### User Model (MongoDB Schema)
```javascript
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, required: true },
  password: String,
  referralCode: { type: String, unique: true }, // Unique code for each user
  referredBy: { type: String, default: null }, // Who referred them
  referredUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Who they referred
  role: { type: String, enum: ["admin", "client", "customer"], default: "customer" }, 
  canSeeSupplierPrice: { type: Boolean, default: false }, // Only if they used a referral code
});

module.exports = mongoose.model("User", userSchema);
```

### Order Model (MongoDB Schema)
```javascript
const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true }],
  totalAmount: Number,
  referralCodeUsed: { type: String, required: true }, // Store which referral code was used
  status: { type: String, enum: ["pending", "completed"], default: "pending" }
});

module.exports = mongoose.model("Order", orderSchema);
```

### Product Model (MongoDB Schema)
```javascript
const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  supplierPrice: Number, // Hidden from general customers
});

module.exports = mongoose.model("Product", productSchema);
```

## 2. Backend API Routes (Node.js & Express)

### Generate Referral Code (On Signup)
```javascript
const generateReferralCode = () => {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
};
```
Assign this referral code when a user signs up.

### Register with Referral Code
```javascript
app.post("/register", async (req, res) => {
  const { name, email, password, referralCode } = req.body;
  
  let referrer = null;
  if (referralCode) {
    referrer = await User.findOne({ referralCode });
    if (!referrer) return res.status(400).json({ message: "Invalid referral code" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({
    name,
    email,
    password: hashedPassword,
    referralCode: generateReferralCode(),
    referredBy: referrer ? referrer.referralCode : null,
    canSeeSupplierPrice: !!referrer,
  });

  if (referrer) {
    referrer.referredUsers.push(newUser._id);
    await referrer.save();
  }

  await newUser.save();
  res.status(201).json({ message: "User registered successfully", referralCode: newUser.referralCode });
});
```
- If a user registers with a referral code, they get `canSeeSupplierPrice = true`.
- The referrer gets this user added to `referredUsers`.

### Track Referrals
```javascript
app.get("/referrals/:referralCode", async (req, res) => {
  const user = await User.findOne({ referralCode: req.params.referralCode }).populate("referredUsers");
  if (!user) return res.status(404).json({ message: "Referral not found" });

  res.json({
    referralCode: user.referralCode,
    referredUsers: user.referredUsers.map(user => ({ name: user.name, email: user.email }))
  });
});
```
- The referrer can see the list of people they referred.

### Purchase with Referral Code
```javascript
app.post("/purchase", async (req, res) => {
  const { customerId, products, referralCode } = req.body;
  const customer = await User.findById(customerId);
  if (!customer) return res.status(404).json({ message: "User not found" });

  const order = new Order({
    customer: customer._id,
    products,
    referralCodeUsed: referralCode
  });

  await order.save();
  res.status(201).json({ message: "Purchase recorded", order });
});
```
- This tracks which referral code was used for the purchase.

## 3. Frontend Implementation (React)

### Show Supplier Price if User Has Referral Code
```javascript
const ProductCard = ({ product, user }) => {
  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      <p>Price: ₱{product.price}</p>
      {user?.canSeeSupplierPrice && <p>Supplier Price: ₱{product.supplierPrice}</p>}
    </div>
  );
};
```
- Only users with `canSeeSupplierPrice = true` will see the supplier price.

### Track Referrals for Logged-in Users
```javascript
const ReferralDashboard = () => {
  const [referredUsers, setReferredUsers] = useState([]);
  
  useEffect(() => {
    axios.get(`/referrals/${loggedInUser.referralCode}`).then(res => {
      setReferredUsers(res.data.referredUsers);
    });
  }, []);

  return (
    <div>
      <h2>Your Referrals</h2>
      {referredUsers.length ? (
        <ul>
          {referredUsers.map(user => <li key={user.email}>{user.name} - {user.email}</li>)}
        </ul>
      ) : <p>No referrals yet</p>}
    </div>
  );
};
```
- This allows referrers to track who they referred.

## 4. Referral Logic Summary
✔️ Existing users get a unique referral code.
✔️ New users can sign up using a referral code.
✔️ Referrers can track their referrals.
✔️ Users with a referral code can see supplier prices.
✔️ Purchases track which referral code was used.

## 5. Deployment Notes
- Use **MongoDB Atlas** or **Local MongoDB** for database hosting.
- Deploy backend using **Heroku**, **Vercel**, or **AWS**.
- Host frontend on **Vercel**, **Netlify**, or **GitHub Pages**.
- Implement email notifications for successful referrals using **Nodemailer**.


