import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

import Modal from "./Modal";

describe("Modal", () => {
  beforeEach(() => {
    document.body.style.overflow = "";
  });

  it("locks body scrolling while open and restores it when closed", async () => {
    document.body.style.overflow = "auto";

    const { rerender } = render(
      <Modal show title="SharePoint File Picker">
        <div>Picker content</div>
      </Modal>,
    );

    await waitFor(() => {
      expect(document.body.style.overflow).toBe("hidden");
    });

    rerender(
      <Modal show={false} title="SharePoint File Picker">
        <div>Picker content</div>
      </Modal>,
    );

    await waitFor(() => {
      expect(document.body.style.overflow).toBe("auto");
      expect(screen.queryByText("Picker content")).not.toBeInTheDocument();
    });
  });

  it("contains overscroll inside the modal body", () => {
    render(
      <Modal show title="SharePoint File Picker">
        <div>Picker content</div>
      </Modal>,
    );

    expect(screen.getByText("Picker content").parentElement.style.overscrollBehavior).toBe(
      "contain",
    );
  });
});
