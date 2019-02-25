import * as React from "react";
import {Component} from "react";
import {observer} from "mobx-react";
import PopupPageModel from "./PopupPageModel";

type PopupPageProps = {
  model: PopupPageModel
}

@observer
class PopupPage extends Component<PopupPageProps> {
  render() {
    return (
      <div>
        <h1>Popup</h1>
        <p>Debugging:</p>
        <p>{JSON.stringify(this.props.model.url)}</p>
      </div>
    );
  }
}

export default PopupPage;
