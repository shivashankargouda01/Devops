import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { TeacherAbsent } from "../models/absentteacher.model";
import { ApiResponse } from "../utils/ApiResponse";

const addTeachersAbsent = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "User not verified");
  }

  const { isAdmin } = req.user;
  if (!isAdmin) {
    throw new ApiError(403, "User not authorized");
  }

  const { teachers, day } = req.body;
  if (!teachers || !teachers.length || !day) {
    throw new ApiError(400, "Teachers and day are required");
  }

  const teacherData = teachers.map((teacher: string[]) => {
    return { teacher, day };
  });
  
  const teacherAbsent = await TeacherAbsent.create(teacherData)
  if (!teacherAbsent) {
    throw new ApiError(400, "Teachers absent not added");
  }

  const populatedTeachers = await TeacherAbsent.populate(teacherAbsent, {
    path: "teacher",
    select: "fullName email",
    model: "user",
    strictPopulate: false
  })

  if(!populatedTeachers){
    throw new ApiError(400, "Teachers details were not fetched")
  }
  
  return res
    .status(201)
    .json(new ApiResponse(201, teacherAbsent, "Teachers absent added"));
});

const getTeachersAbsent = asyncHandler(async (req: Request, res: Response) => {
  const { day } = req.query;

  if (!day) {
    throw new ApiError(400, "Day is required");
  }

  const teachersAbsent = await TeacherAbsent.find({ day }).populate({
    path: "teacher",
    select: "fullName email",
    model: "user",
    strictPopulate: false,
  });

  if (!teachersAbsent || !teachersAbsent.length) {
    throw new ApiError(404, "No absent teachers found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, teachersAbsent, "Absent teachers found"));
});

export { addTeachersAbsent, getTeachersAbsent };
