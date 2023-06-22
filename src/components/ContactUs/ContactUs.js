import React, { useState } from "react";
import { useFormik } from "formik";
import api from "util/api";
import { contactUsSchema } from "schema/schema";
import Alert from "components/Alerts/Alert";
import ReCAPTCHA from "react-google-recaptcha";

const initialValues = {
  name: "",
  username: "",
  message: "",
  recaptcha: "",
};

const ContactUs = () => {
  const [recaptchaValue, setRecaptchaValue] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState({
    submitted: false,
    status: "",
    message: "",
    color: "",
  });

  const {
    values,
    errors,
    touched,
    handleBlur,
    handleChange,
    handleSubmit,
    setFieldValue,
  } = useFormik({
    initialValues,
    validationSchema: contactUsSchema,
    onSubmit: (values, action) => {
      api
        .post("contact_us", {
          name: values.name,
          username: values.username,
          message: values.message,
        })
        .then((response) => {
          console.log(response);
          if (response.status === 200) {
            setIsSubmitted({
              submitted: true,
              status: "Success: ",
              message: response.data.message,
              color: "bg-emerald-500",
            });
          }
          return response;
        })
        .catch((error) => {
          console.log(error);
          setIsSubmitted({
            submitted: true,
            status: "Error: ",
            message: error.message,
            color: "bg-orange-500",
          });
        });
      action.resetForm();
      action.setSubmitting(false);
    },
  });

  return (
    <section className="relative block py-24 lg:pt-0 bg-blueGray-800">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-center lg:-mt-64 -mt-48">
          <div className="w-full lg:w-6/12 px-4">
            <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-blueGray-200">
              <div className="flex-auto p-5 lg:p-10">
                <h4 className="text-2xl font-semibold">Request a Demo</h4>
                <p className="leading-relaxed mt-1 mb-4 text-blueGray-500">
                  Complete this form and we will get back to you in 24 hours.
                </p>
                <form onSubmit={handleSubmit}>
                  <div className="relative w-full mb-3 mt-8">
                    <label
                      className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                      htmlFor="full-name"
                    >
                      Full Name
                    </label>
                    <input
                      type="text"
                      className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150 ${
                        errors.name
                          ? "focus:ring-red-300"
                          : "focus:ring-blueGray-300"
                      }`}
                      placeholder="Full Name"
                      name="name"
                      id="name"
                      autoComplete="off"
                      value={values.name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    {errors.name && touched.name && (
                      <p className="text-xs text-red-500 float-right bg-red-100 p-1">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                        &nbsp; {errors.name}
                      </p>
                    )}
                  </div>

                  <div className="relative w-full mb-3">
                    <label
                      className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                      htmlFor="email"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150 ${
                        errors.username
                          ? "focus:ring-red-300"
                          : "focus:ring-blueGray-300"
                      }`}
                      placeholder="Email"
                      name="username"
                      autoComplete="off"
                      id="email"
                      value={values.username}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    {errors.username && touched.username && (
                      <p className="text-xs text-red-500 float-right bg-red-100 p-1">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                        &nbsp; {errors.username}
                      </p>
                    )}
                  </div>

                  <div className="relative w-full mb-3">
                    <label
                      className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                      htmlFor="message"
                    >
                      Message
                    </label>
                    <textarea
                      rows="4"
                      cols="80"
                      className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                        errors.message
                          ? "focus:ring-red-300"
                          : "focus:ring-blueGray-300"
                      }`}
                      placeholder="Type a message..."
                      name="message"
                      id="message"
                      value={values.message}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    {errors.message && touched.message && (
                      <p className="text-xs text-red-500 float-right bg-red-100 p-1">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                        &nbsp; {errors.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <ReCAPTCHA
                      sitekey="6LdAHLwlAAAAAK_CUBmN7dWgwgd7c_oln-0SzTLS"
                      onChange={(value) => {
                        setRecaptchaValue(value);
                        setFieldValue("recaptcha", value);
                        console.log(value)
                      }}
                    />
                    {errors.recaptcha && touched.recaptcha && (
                      <p className="text-xs text-red-500 float-right bg-red-100 p-1">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                        &nbsp; {errors.recaptcha}
                      </p>
                    )}
                  </div>
                  {isSubmitted.submitted && (
                    <Alert
                      alertClass={isSubmitted.color}
                      alertTitle={isSubmitted.status}
                      alertMessage={isSubmitted.message}
                    />
                  )}

                  <div className="text-center mt-6">
                    <button
                      className="bg-blueGray-800 text-white active:bg-blueGray-600 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
                      type="submit"
                      disabled={!recaptchaValue}
                    >
                      Send Message
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
export default ContactUs;
