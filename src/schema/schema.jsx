import * as Yup from "yup";

export const signUpSchema = Yup.object({
  name: Yup.string().min(2).max(25).required("Please enter your name."),
  username: Yup.string()
    .email()
    .required("Please enter your email."),
    // .test(
    //   "is valid",
    //   "Please signup with your official MAP Patient Access email address.",
    //   (val) => {
    //     if (val !== undefined) {return val.includes("mappatientaccess.com")}}
    // ),
  password: Yup.string()
    .min(6)
    .required("Please enter your password")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/,
      "Must Contain 8 Characters, One Uppercase, One Lowercase, One Number and One Special Case Character"
    ),
  confirm_password: Yup.string()
    .required()
    .oneOf([Yup.ref("password"), null], "Password must match."),
});

export const signInSchema = Yup.object({
  username: Yup.string()
    .email()
    .required("Please enter your email"),
    // .test(
    //   "is valid",
    //   "Please signup with your official MAP Patient Access email address.",
    //   (val) => val.includes("mappatientaccess.com")
    // ),
  password: Yup.string()
    .min(6)
    .required("Please enter your password")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/,
      "Must Contain 8 Characters, One Uppercase, One Lowercase, One Number and One Special Case Character"
    ),
});

export const createProjectSchema = Yup.object({
  projectName: Yup.string().min(6).required("Please enter project name."),
  projectDescription: Yup.string().min(10)
})

export const contactUsSchema = Yup.object({
  name: Yup.string().min(2).max(25).required("Please enter your name."),
  username: Yup.string()
    .email()
    .required("Please enter your email."),
  message: Yup.string().min(10).required("Please enter a message."),
  recaptcha: Yup.string(),
});