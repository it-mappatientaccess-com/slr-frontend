import React from "react";
import { useSelector } from "react-redux";
import CardCategories from "components/Cards/CardCategories.js";
import Alert from "components/Alerts/Alert";
export default function HeaderStats() {
  const isQuestionsEmpty = useSelector(
    (state) => state.questionAbstractData.isQuestionsEmpty
  );
  return (
    <>
      <div className="relative bg-lightBlue-600 pb-16">
        <div className="px-4 mx-auto w-full">
          <div>
            <div className="flex flex-wrap">
              <div className="w-full lg:w-6/12 xl:w-3/12 px-2">
                <CardCategories
                  subtitle="RCT, NON-RCT, cohort study"
                  title="STUDY DESIGN"
                  iconName="fas fa-graduation-cap"
                  iconColor="bg-red-500"
                />
              </div>
              <div className="w-full lg:w-6/12 xl:w-3/12 px-4 ">
                <CardCategories
                  subtitle="Patient, problem or population"
                  title="POPULATION"
                  iconName="fas fa-users"
                  iconColor="bg-orange-500"
                />
              </div>
              <div className="w-full lg:w-6/12 xl:w-3/12 px-4">
                <CardCategories
                  subtitle="Investigated condition, exposure"
                  title="INTERVENTION"
                  iconName="fas fa-disease"
                  iconColor="bg-pink-500"
                />
              </div>
              <div className="w-full lg:w-6/12 xl:w-3/12 px-4">
                <CardCategories
                  subtitle="symptom, syndrome, disease"
                  title="OUTCOMES"
                  iconName="fas fa-comment-medical"
                  iconColor="bg-lightBlue-500"
                />
              </div>
            </div>
          </div>
          {isQuestionsEmpty && (
        <Alert
          alertClass="bg-orange-500 mt-5"
          alertTitle="No Questions Provided!"
          alertMessage="Please enter question(s) in their respective categories."
        />
      )}
        </div>
      </div>
    </>
  );
}
