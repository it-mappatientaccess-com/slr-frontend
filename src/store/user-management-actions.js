import api from "util/api";
import { UserManagementActions } from "slices/userManagementSlice";

/**
 * Fetches users data from an API and updates the Redux store.
 * @returns {Function} The async function that fetches user data.
 */
export const fetchUsersData = () => async (dispatch) => {
  try {
    dispatch(UserManagementActions.setProgress({ progress: 70 }));

    const response = await api.get("users", {
      headers: {
        Authorization: localStorage.getItem("token"),
      },
    });
    const listOfUsers = Object.entries(response.data).map((e) => e[1]);

    dispatch(UserManagementActions.setListOfUsers({ listOfUsers }));
    dispatch(UserManagementActions.setProgress({ progress: 100 }));
  } catch (error) {
    dispatch(UserManagementActions.setError({ error: "Failed to fetch users." }));
    dispatch(UserManagementActions.setProgress({ progress: 100 }));
  }
};
export const setUsersData = (username, newDetails) => async (dispatch) => {
  try {
    const response = await api.put(`users/${username}/?newDetails=${JSON.stringify(newDetails)}`, {}, {
        headers: {
            Authorization: localStorage.getItem("token"),
        },
    });
    if (response.data.status === 200) {
      dispatch(UserManagementActions.setUpdateResponse({ type: 'success', message: `User updated successfully: ${response.data.username}` }));
    } else {
      dispatch(UserManagementActions.setUpdateResponse({ type: 'error', message: 'Failed to update user.' }));
    }

    dispatch(fetchUsersData());
    return response;
  } catch (error) {
    console.error(error);
    dispatch(UserManagementActions.setUpdateResponse({ type: 'error', message: error.response.data.detail }));
    return error;
  }
};

export const deleteUserData = (username) => async (dispatch) => {
    try {
        const response = await api.delete(`users/${username}`, {
            headers: {
                Authorization: localStorage.getItem("token"),
            },
        });
        dispatch(fetchUsersData());
        return response;
    } catch (error) {
        console.error(error);
        dispatch(UserManagementActions.setError({ error: "Failed to delete user." }));
    }
};

export function resetUserManagementStore() {
    return (dispatch) => {
        dispatch(UserManagementActions.resetUMStore({ resetStore: true }));
    };
}

export function setProgress(progress) {
    return (dispatch) => {
        dispatch(UserManagementActions.setProgress({ progress }));
    };
}
