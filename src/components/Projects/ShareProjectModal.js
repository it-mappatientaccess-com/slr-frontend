import React, { useState, useEffect } from "react";
import Modal from "../Modal/Modal";
import { useDispatch, useSelector } from "react-redux";
import { shareProject, unshareProject } from "../../redux/slices/projectSlice";
import Select from "react-select";
import { fetchUsersData } from "../../redux/slices/userManagementSlice";

const ShareProjectModal = ({ isOpen, onClose, project }) => {
  const dispatch = useDispatch();
  const allUsers = useSelector((state) => state.userManagement.listOfUsers);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [sharedUsers, setSharedUsers] = useState([]);

  // Fetch all users when modal opens
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchUsersData());
      setSharedUsers(project.shared_with || []);
    }
  }, [isOpen, dispatch, project.shared_with]);

  const handleShare = () => {
    const userEmails = selectedUsers.map((user) => user.value);
    dispatch(
      shareProject({
        projectId: project.id,
        sharedWith: userEmails,
      })
    );
    onClose();
  };

  const handleUnshare = (userEmail) => {
    dispatch(
      unshareProject({
        projectId: project.id,
        removeUsers: [userEmail],
      })
    );
    // Update local state
    setSharedUsers(sharedUsers.filter((email) => email !== userEmail));
  };

  // Prepare options for Select component
  const currentUser = localStorage.getItem("username");
  // Exclude current user and already shared users
  const userOptions = allUsers
    .filter(
      (user) =>
        user.username !== currentUser && !sharedUsers.includes(user.username)
    )
    .map((user) => ({
      value: user.username,
      label: user.username,
    }));

  // Limit selection to a maximum of 5 users
  const maxUsersSelected = selectedUsers.length >= 5;

  return (
    <Modal show={isOpen} onClose={onClose} title="Share Project">
      <div className="p-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Select Users to Share With (max 5):
        </label>
        <Select
          isMulti
          options={userOptions}
          onChange={setSelectedUsers}
          maxMenuHeight={150}
          placeholder="Select users..."
          isOptionDisabled={() => maxUsersSelected}
        />
        <button
          className="bg-indigo-500 text-white active:bg-indigo-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150 mt-4"
          onClick={handleShare}
          disabled={selectedUsers.length === 0}
        >
          Share Project <i className="fas fa-share-alt"></i>
        </button>

        {sharedUsers.length > 0 && (
          <>
            <h3 className="mt-6 mb-2 font-semibold">Currently Shared With:</h3>
            <ul>
              {sharedUsers.map((email) => (
                <li key={email} className="flex justify-between items-center">
                  <span>{email} &nbsp;</span>
                  <button
                    className="text-red-500"
                    onClick={() => handleUnshare(email)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Modal>
  );
};

export default ShareProjectModal;
