import React from "react";
import { useFormik } from "formik";
import { createPromptSchema } from "../../schema/schema";
import {api} from "util/api";
import { fetchPrompts } from "../../redux/thunks/dataExtractionThunks";
import { useDispatch } from "react-redux";
import { notify } from "components/Notify/Notify";

export default function EditPrompt({ title, content, onEditSuccess }) {
  const dispatch = useDispatch();
    // Set initial values using the passed props
    const initialValues = {
      promptTitle: title || "",
      promptText: content || "",
    };
  const { values, errors, touched, handleBlur, handleChange, handleSubmit } =
    useFormik({
      initialValues,
      validationSchema: createPromptSchema,
      onSubmit: (values, action) => {
        api
          .put(
            `prompt/${title}`,
            {
              title: title,
              projectName: localStorage.getItem("selectedProject"),
              prompt_title: values.promptTitle,
              prompt_text: values.promptText,
              is_default: false
            },
            {
              headers: {
                Authorization: localStorage.getItem("token"),
              },
            }
          )
          .then((response) => {
            if (response.status === 200) {
              notify("Prompt updated successfully", "success");
              dispatch(fetchPrompts());
              onEditSuccess && onEditSuccess();
            }
            return response;
          })
          .catch((error) => {
            console.log(error);
            notify(error?.response?.data?.message, "error");
          });
        action.resetForm();
      },
    });
  return (
    <>
      <div className="relative flex flex-col min-w-0 break-words w-10/12 mx-auto mb-6 shadow-lg rounded-lg bg-blueGray-100 border-0">
        <div className="rounded-t bg-white mb-0 px-6 py-6">
          <div className="text-center flex justify-between">
            <h6 className="text-blueGray-700 text-xl font-bold">
              Edit Prompt
            </h6>
          </div>
        </div>
        <div className="flex-auto px-4 lg:px-10 py-10 pt-0">
          <form onSubmit={handleSubmit}>
            <h6 className="text-blueGray-400 text-sm mt-3 mb-6 font-bold uppercase">
              Prompt Information
            </h6>
            <div className="flex flex-wrap">
              <div className="w-full">
                <div className="relative w-full mb-3">
                  <label
                    className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                    htmlFor="promptTitle"
                  >
                    Prompt Title
                  </label>
                  <input
                    id="promptTitle"
                    type="text"
                    className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none  w-full ease-linear transition-all duration-150 focus:ring ${
                      errors.promptTitle
                        ? "focus:ring-red-300"
                        : "focus:ring-blueGray-300"
                    }`}
                    placeholder="Enter prompt title"
                    name="promptTitle"
                    value={values.promptTitle}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {errors.promptTitle && touched.promptTitle && (
                    <p className="text-xs text-red-500 float-right bg-red-100 p-1">
                      <i className="fa-solid fa-triangle-exclamation"></i>
                      {errors.promptTitle}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap">
              <div className="w-full">
                <div className="relative w-full mb-3">
                  <label
                    className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                    htmlFor="promptText"
                  >
                    Prompt Text
                  </label>
                  <textarea
                    id="promptText"
                    type="text"
                    className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none  w-full ease-linear transition-all duration-150 focus:ring ${
                      errors.promptText
                        ? "focus:ring-red-300"
                        : "focus:ring-blueGray-300"
                    }`}
                    placeholder="Enter prompt text."
                    rows="4"
                    name="promptText"
                    value={values.promptText}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  ></textarea>
                  {errors.promptText && touched.promptText && (
                    <p className="text-xs text-red-500 float-right bg-red-100 p-1">
                      <i className="fa-solid fa-triangle-exclamation"></i>
                      {errors.promptText}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <button
              className="bg-lightBlue-500 text-white active:bg-lightBlue-600 font-bold uppercase text-sm px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 ease-linear transition-all duration-150"
              type="submit"
            >
              Submit
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
