const User = {
  name: {
    type: String,
    required: [true, "Please enter a full name"],
    index: true,
  },

  email: {
    type: String,
    lowercase: true,
    unique: true,
    index: true,
  },

  password: String,

  salt: String,

  role: {
    type: String,
    default: "user",
  },
};

// export default mongoose.model<IUser & mongoose.Document>("User", User);
export default User;
