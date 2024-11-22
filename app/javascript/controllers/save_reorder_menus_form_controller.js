import { Controller } from '@hotwired/stimulus';

export default class extends Controller {
  get messageFrameId() {
    return 'save_menus_frame';
  }

  initHandlers() {
    this.handleSubmitStart = this.handleSubmitStart.bind(this);
    this.handleBeforeStreamRender = this.handleBeforeStreamRender.bind(this);
    this.initSaveMenuIds = this.initSaveMenuIds.bind(this);
    this.handleSelectedMenusChanged = this.handleSelectedMenusChanged.bind(this);
  }

  connect() {
    this.triggerElement = null;
    this.initHandlers();
    this.initEventListeners();
    this.initSaveMenuIds();
  }

  disconnect() {
    this.element.removeEventListener('turbo:submit-start', this.handleSubmitStart);
    document.removeEventListener('turbo:before-stream-render', this.handleBeforeStreamRender);
  }

  initEventListeners() {
    this.element.addEventListener('turbo:submit-start', this.handleSubmitStart);
    document.addEventListener('turbo:before-stream-render', this.handleBeforeStreamRender);
  }

  handleSelectedMenusChanged(event) {
    this.element.querySelector(`[name='user_menus[selected_menus]']`).value = JSON.stringify(event.detail);
  }

  initSaveMenuIds() {
    const controllerEl = document.querySelector(`[data-controller='reorder-menus']`);
    if (!controllerEl)
      return;
  
    controllerEl.addEventListener('reorder-menus-controller:selected-menus-changed', this.handleSelectedMenusChanged);
  }

  handleSubmitStart(event) {
    this.triggerElement = event.detail.formSubmission.submitter;
    this.setButtonDisabledState();

    const frame = event.target.querySelector(`#${this.messageFrameId}`);
    if (frame)
      frame.innerHTML = '';
  }

  removeButtonDisabledState() {
    this.element.querySelectorAll(`[type='submit']`).forEach((el) => {
      el.removeAttribute('disabled');
      el.classList.remove('disabled', 'opacity-40', 'cursor-not-allowed');
    });
  }

  setButtonDisabledState() {
    this.element.querySelectorAll(`[type='submit']`).forEach((el) => {
      el.setAttribute('disabled', 'disabled');
      el.classList.add('disabled', 'opacity-40', 'cursor-not-allowed');
    });
  }

  handleBeforeStreamRender(event) {
    const newStream = event.detail.newStream;
    if (newStream.target !== this.messageFrameId)
      return;

    if (newStream.templateElement.content.querySelector('.is-error')) {
      this.removeButtonDisabledState();
      return;
    }

    const closeWhenSuccess = this.triggerElement.classList.contains('btn-close-on-success');
    if (closeWhenSuccess) {
      this.setButtonDisabledState();

      // close the modal
      this.closeModal();
      return;
    }

    this.removeButtonDisabledState();
  }

  closeModal() {
    const modal = this.element.closest('[data-controller="modals"]');
    if (!modal)
      return;

    const controller = this.application.getControllerForElementAndIdentifier(modal, 'modals');
    if (!controller)
      return;
    
    setTimeout(() => {
      controller.close();
    }, 2000);
  }
}
