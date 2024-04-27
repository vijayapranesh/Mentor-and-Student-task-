const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
require("dotenv").config();

// Importing the models
const Mentor = require("./models/Mentor");
const Student = require("./models/Student");
const app = express();
const PORT = process.env.PORT || 3000; // Use a default port if PORT is not defined in .env
const DB_URL = process.env.DB_URL;
app.use(bodyParser.json()); // For parsing JSON bodies

// Connect to MongoDB
mongoose
  .connect(DB_URL, {
    useNewUrlParser: true, // Use new URL parser
    useUnifiedTopology: true, // Use new Server Discover and Monitoring engine
  })
  .then(() => console.log("Connected to MongoDB Compass"))
  .catch((err) => console.error("Could not connect to MongoDB", err));

// CREATE Mentor
app.post("/mentor", async (req, res) => {
  try {
    const mentor = new Mentor(req.body);
    await mentor.save();
    res.status(201).send(mentor); // Use HTTP status code 201 for resource creation
  } catch (error) {
    res.status(400).send(error);
  }
});

// CREATE Student
app.post("/student", async (req, res) => {
  try {
    const student = new Student(req.body);
    await student.save();
    res.status(201).send(student); // Use HTTP status code 201 for resource creation
  } catch (error) {
    res.status(400).send(error);
  }
});

// Assign multiple students to a mentor
app.post("/mentor/:mentorId/assign", async (req, res) => {
  try {
    const mentor = await Mentor.findById(req.params.mentorId);
    const students = await Student.find({ _id: { $in: req.body.students } });

    students.forEach((student) => {
      student.cMentor = mentor._id;
      student.save();
    });

    mentor.students = [
      ...mentor.students,
      ...students.map((student) => student._id),
    ];
    await mentor.save();
    res.send(mentor);
  } catch (error) {
    res.status(400).send(error);
  }
});

app.put("/student/:studentId/assignMentor/:mentorId", async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);
    const newMentor = await Mentor.findById(req.params.mentorId);

    // Check if the student or mentor doesn't exist
    if (!student || !newMentor) {
      return res.status(404).json({ error: "Student or Mentor not found" });
    }

    // Check if the student is already assigned to the same mentor
    if (student.cMentor && student.cMentor.toString() === req.params.mentorId) {
      return res
        .status(400)
        .json({ error: "Student is already assigned to this mentor" });
    }

    // If the student already has a mentor, remove the student from the previous mentor's students array
    if (student.cMentor) {
      student.pMentor.push(student.cMentor);
      const previousMentor = await Mentor.findById(student.cMentor);
      if (previousMentor) {
        previousMentor.students.pull(student._id);
        await previousMentor.save();
      }
    }

    // Assign the new mentor
    student.cMentor = newMentor._id;

    // Add the student to the new mentor's students array
    newMentor.students.push(student._id);

    // Save both the student and new mentor documents
    await student.save();
    await newMentor.save();

    // Send the updated student document as a response
    res.status(200).json(student);
  } catch (error) {
    // Handle errors properly and send a meaningful response
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Show all students for a particular mentor
app.get("/mentor/:mentorId/students", async (req, res) => {
  try {
    const mentor = await Mentor.findById(req.params.mentorId).populate(
      "students"
    );
    res.send(mentor.students);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Show the previously assigned mentor for a particular student
app.get("/student/:studentId/pMentor", async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId).populate(
      "pMentor"
    );
    if (!student) {
      return res.status(404).json({ error: "No previous Mentor Available" });
    } else {
      res.send(student.pMentor);
    }
  } catch (error) {
    res.status(400).send(error);
  }
});

app.listen(PORT, () => {
  console.log("Server is running on PORT:", PORT);
});