import api from "util/api";
import { ProjectActions } from "slices/projectSlice";

export const fetchProjectsData = () => {
  return async (dispatch) => {
    dispatch(
      ProjectActions.setProgress({
        progress: 70,
      })
    );
    const sendData = async () => {
      return await api
        .get("project", {
          headers: {
            Authorization: localStorage.getItem("token"),
          },
        })
        .then((response) => {
          return response;
        });
    };
    try {
      const projects = await sendData();
      dispatch(
        ProjectActions.setListOfProjects({
          listOfProjects: Object.entries(projects.data).map((e) => e[1]),
        })
      );
      dispatch(
        ProjectActions.setProgress({
          progress: 100,
        })
      );
    } catch (error) {
      console.log(error);
      dispatch(
        ProjectActions.setProgress({
          progress: 100,
        })
      );
    }
  };
};

export const setProjectsData = (projectName, newDescription) => {
  return async (dispatch) => {
    const sendData = async () => {
      return await api
        .put(
          `project/${projectName}/?projectDescription=${newDescription}`,
          {},
          {
            headers: {
              Authorization: localStorage.getItem("token"),
            },
          }
        )
        .then((response) => {
          return response;
        });
    };
    try {
      const project = await sendData(newDescription);
      console.log(project);
      dispatch(fetchProjectsData());
    } catch (error) {
      console.log(error);
    }
  };
};

export const deleteProjectData = (projectName) => {
  return async (dispatch) => {
    const sendData = async () => {
      return await api
        .delete(`project/${projectName}`, {
          headers: {
            Authorization: localStorage.getItem("token"),
          },
        })
        .then((response) => {
          return response;
        });
    };
    try {
      const projectData = await sendData(projectName);
      console.log(projectData);
      dispatch(fetchProjectsData());
    } catch (error) {
      console.log(error);
    }
  };
};

export const setSelectedProject = (projectName) => {
  return (dispatch) => {
    localStorage.setItem("selectedProject", projectName);
    dispatch(
      ProjectActions.setSelectedProject({
        selectedProject: projectName,
      })
    );
  };
};

export function resetProjectStore() {
  return (dispatch) => {
    dispatch(
      ProjectActions.resetProjectStore({
        resetStore: true,
      })
    );
  };
}

export function setProgress(progress) {
  return (dispatch) => {
    dispatch(
      ProjectActions.setProgress({
        progress,
      })
    );
  };
}
