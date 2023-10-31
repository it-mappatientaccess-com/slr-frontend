import React from "react";

export default function FooterAdmin() {
  return (
    <>
      <footer className="block py-4">
        <div className="container mx-auto px-4">
          <hr className="mb-4 border-b-1 border-blueGray-200" />
          <div className="flex flex-wrap items-center md:justify-between justify-center">
            <div className="w-full md:w-4/12 px-4">
              <div className="text-sm text-blueGray-500 font-semibold py-1 text-center md:text-left">
                Copyright © {new Date().getFullYear()}{" "}
                <a
                  href="https://www.mappatientaccess.com/"
                  className="text-blueGray-500 hover:text-blueGray-700 text-sm font-semibold py-1"
                  target="_blank"
                  rel="noreferrer"
                >
                  MAP Patient Access Limited
                </a>
              </div>
            </div>
            <div className="w-full md:w-8/12 px-4">
              <ul className="flex flex-wrap list-none md:justify-end  justify-center">
                <li>
                  <a
                    href="https://www.mappatientaccess.com/"
                    className="text-blueGray-600 hover:text-blueGray-800 text-sm font-semibold block py-1 px-3"
                    target="_blank"
                    rel="noreferrer"
                  >
                    MAP Patient Access
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.mappatientaccess.com/contactus/"
                    className="text-blueGray-600 hover:text-blueGray-800 text-sm font-semibold block py-1 px-3"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Contact Us
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.mappatientaccess.com/blog/"
                    className="text-blueGray-600 hover:text-blueGray-800 text-sm font-semibold block py-1 px-3"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Blog
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
