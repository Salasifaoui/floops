import { useMemo, useState } from "react";
import AppwriteImportPage from "./pages/appwrite-import";
import WorkflowPage from "./pages/workflow";
import "./App.css";

const FLOW_STORAGE_KEY = "sufax-flow:flow-document";

const SERVICES = [
  {
    id: "workflow",
    title: "Workflow Builder",
    description: "Design data tables, relations, and flow graph from one visual canvas.",
    status: "available",
  },
  {
    id: "appwrite-import",
    title: "Appwrite Import",
    description: "Connect to Appwrite and import schema directly into the workflow editor.",
    status: "available",
  },
  {
    id: "team-collab",
    title: "Team Collaboration",
    description: "Share, comment, and co-edit project flows with your team.",
    status: "planned",
  },
];

export default function App() {
  const [activeView, setActiveView] = useState("home");

  const availableServices = useMemo(
    () => SERVICES.filter((service) => service.status === "available").length,
    [],
  );

  if (activeView === "workflow") {
    return (
      <div className="service-view">
        <div className="service-view__topbar">
          <button
            type="button"
            className="service-view__back-btn"
            onClick={() => setActiveView("home")}
          >
            Back to Services
          </button>
        </div>
        <WorkflowPage />
      </div>
    );
  }

  if (activeView === "appwriteImport") {
    return (
      <AppwriteImportPage
        onBack={() => setActiveView("home")}
        onOpenWorkflow={(flowDocument) => {
          window.localStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(flowDocument));
          setActiveView("workflow");
        }}
      />
    );
  }

  function openService(serviceId) {
    if (serviceId === "workflow") {
      setActiveView("workflow");
      return;
    }
    if (serviceId === "appwrite-import") {
      setActiveView("appwriteImport");
    }
  }

  return (
    <main className="service-hub">
      <header className="service-hub__header">
        <p className="service-hub__eyebrow">Sufax Flow</p>
        <h1>Project Services</h1>
        <p>
          Choose a service to continue. {availableServices} service is ready now and more modules
          are planned.
        </p>
      </header>

      <section className="service-hub__grid" aria-label="Services list">
        {SERVICES.map((service) => {
          const isAvailable = service.status === "available";
          return (
            <article className="service-card" key={service.id}>
              <div className="service-card__meta">
                <span className={`service-card__badge ${isAvailable ? "is-available" : "is-planned"}`}>
                  {isAvailable ? "Available" : "Planned"}
                </span>
              </div>
              <h2>{service.title}</h2>
              <p>{service.description}</p>
              <button
                type="button"
                className="service-card__action"
                disabled={!isAvailable}
                onClick={() => isAvailable && openService(service.id)}
              >
                {isAvailable ? "Open service" : "Coming soon"}
              </button>
            </article>
          );
        })}
      </section>
    </main>
  );
}
