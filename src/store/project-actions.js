import {api} from "util/api";
import { ProjectActions } from "slices/projectSlice";

/**
 * Fetches project data from an API and updates the Redux store.
 * @returns {Function} The async function that fetches project data.
 */
export const fetchProjectsData = () => async (dispatch) => {
  try {
    dispatch(ProjectActions.setProgress({ progress: 70 }));

    const response = await api.get("project", {
      headers: {
        Authorization: localStorage.getItem("token"),
      },
    });

    const listOfProjects = Object.entries(response.data.data).map((e) => e[1]);

    dispatch(ProjectActions.setListOfProjects({ listOfProjects }));
    dispatch(ProjectActions.setProgress({ progress: 100 }));
  } catch (error) {
    console.error(error);
    dispatch(ProjectActions.setError({ error: "Failed to fetch projects." }));
    dispatch(ProjectActions.setProgress({ progress: 100 }));
  }
};

export const setProjectsData = (projectName, newDescription) => async (dispatch) => {
    const data = {
        projectDescription: newDescription // Assuming the backend expects a field named 'description'
    };
    try {
        await api.put(`project/${projectName}`,data, {
            headers: {
                Authorization: localStorage.getItem("token"),
            },
        });
        dispatch(fetchProjectsData());
    } catch (error) {
        console.error(error);
        dispatch(ProjectActions.setError({ error: "Failed to update project." }));
    }
};

export const deleteProjectData = (projectName) => async (dispatch) => {
    try {
        await api.delete(`project/${projectName}`, {
            headers: {
                Authorization: localStorage.getItem("token"),
            },
        });
        dispatch(fetchProjectsData());
    } catch (error) {
        console.error(error);
        dispatch(ProjectActions.setError({ error: "Failed to delete project." }));
    }
};

export const setSelectedProject = (projectName) => (dispatch) => {
    localStorage.setItem("selectedProject", projectName);
    dispatch(ProjectActions.setSelectedProject({ selectedProject: projectName }));
};

export function resetProjectStore() {
    return (dispatch) => {
        dispatch(ProjectActions.resetProjectStore({ resetStore: true }));
    };
}

export function setProgress(progress) {
    return (dispatch) => {
        dispatch(ProjectActions.setProgress({ progress }));
    };
}
