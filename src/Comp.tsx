import ReactDOM from "react-dom/client"

// create a react component and console.log it
export const Component = () => {
    return <div>Hello world</div>;
};

const container = document.createElement("div");
document.body.appendChild(container);
const root = ReactDOM.createRoot(container);

root.render(<Component />);
