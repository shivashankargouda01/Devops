import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { User } from "../models/user.model";
import { ApiResponse } from "../utils/ApiResponse";

const generateAccessToken = async (userId: string) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return await user.generateAccessToken();
  } catch (err) {
    console.log(err);
    throw new ApiError(
      500,
      "Something went wrong, while generating access and refresh tokens"
    );
  }
};

const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "User not verified");
  }

  return res.status(200).json(new ApiResponse(200, req.user, "User found"));
});

const getTeachers = asyncHandler(async (req: Request, res: Response) => {
  const teachers = await User.find().select("-password");
  if (!teachers || !teachers.length) {
    throw new ApiError(404, "Teachers not found");
  }

  return res.status(200).json(new ApiResponse(200, teachers, "Teachers found"));
});

const registerUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "User not verified");
  }

  const { isAdmin } = req.user;
  if (!isAdmin) {
    throw new ApiError(403, "User not authorized");
  }

  const { fullName, email, password } = req.body;
  if (!fullName || !email || !password) {
    throw new ApiError(400, "All fields are required");
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new ApiError(400, "User with this email already exists");
  }

  const user = await User.create({
    fullName,
    email,
    password,
  });

  if (!user) {
    throw new ApiError(400, "Something went wrong, while registering the user");
  }

  user.password = "";

  const accessToken = await generateAccessToken(user._id.toString());

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { user, accessToken },
        "User registered successfully"
      )
    );
});

const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "Invalid email");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid password");
  }

  user.password = "";
  const accessToken = await generateAccessToken(user._id.toString());

  return res
    .status(200)
    .json(
      new ApiResponse(200, { user, accessToken }, "User logged in successfully")
    );
});

const changeAdmin = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "User not verified");
  }

  const { isAdmin } = req.user;
  if (!isAdmin) {
    throw new ApiError(403, "User not authorized");
  }

  const { teacherId } = req.params;

  const user = await User.findById(teacherId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.isAdmin = !user.isAdmin;
  user.save({ validateBeforeSave: false });

  return res.status(200).json(new ApiResponse(200, { admin: user.isAdmin }, user.isAdmin ? "User is now an admin" : "User is now a teacher"));
});

const deleteTeacher = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "User not verified");
  }

  const { isAdmin } = req.user;
  if (!isAdmin) {
    throw new ApiError(403, "User not authorized");
  }

  const { teacherId } = req.params;
  if (!teacherId) {
    throw new ApiError(400, "Teacher id is required");
  }

  await User.findByIdAndDelete(teacherId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Teacher deleted successfully"));
});

export { getTeachers, registerUser, loginUser, changeAdmin, deleteTeacher, getCurrentUser };
