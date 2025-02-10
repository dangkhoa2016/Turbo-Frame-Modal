import { Controller } from '@hotwired/stimulus';
import 'bootstrap';

export default class extends Controller {
  static targets = ['turboFrame', 'errorContainer'];
  static values = { backdropZindex: Number }

  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  get isModalOpen() {
    return this.modal?._isShown;
  }

  get zIndexClass() {
    return this.backdropZindexValue || 1055;
  }

  get abortReason() {
    return 'Aborted by user';
  }

  get confirmButton() {
    return this.element.querySelector('[data-confirm-yes]');
  }

  connect() {
    this.confirmButtonClicked = false;
    this.backupConfirmMessage = null;
    this.turboFrameTargetId = this.turboFrameTarget.id;
    this.defaultModalHeader = this.element.querySelector('.modal-title').textContent;

    this.initEventHandlers();
    this.initModal();
    this.initHandleElements();
    this.initFrameEvent();
    this.initRetryButtonClickHandle();
    this.initConfirmButtonClickHandle();
    this.setLoading();

    document.addEventListener('turbo:before-stream-render', this.handleTurboBeforeStreamRender);
  }

  disconnect() {
    this.cleanupEventHandlers();
    this.cleanupModal();
    this.cleanupFrameEvent();
  }

  turboFrameTargetDisconnected(element) {
    this.cleanupFrameEvent(element);
  }

  initEventHandlers() {
    this.setModalBackdropId = this.setModalBackdropId.bind(this);
    this.showBsModal = this.showBsModal.bind(this);
    this.hideBsModal = this.hideBsModal.bind(this);
    this.handleTurboClickEvent = this.handleTurboClickEvent.bind(this);
    this.handleTurboSubmitStartEvent = this.handleTurboSubmitStartEvent.bind(this);
    this.handleFormFetchRequestError = this.handleFormFetchRequestError.bind(this);
    this.retryRequest = this.retryRequest.bind(this);
    this.handleTurboFrameFetchRequestError = this.handleTurboFrameFetchRequestError.bind(this);
    this.awaitHandleBeforeFetchRequest = this.awaitHandleBeforeFetchRequest.bind(this);
    this.handleBeforeFetchResponse = this.handleBeforeFetchResponse.bind(this);
    this.initFrameEvent = this.initFrameEvent.bind(this);
    this.handleTurboBeforeStreamRender = this.handleTurboBeforeStreamRender.bind(this);
    this.initHandleElements = this.initHandleElements.bind(this);
    this.handleModalClose = this.handleModalClose.bind(this);
  }

  handleOtherRender(stream) {
    if (!stream)
      return;
    
    const streamTarget = stream.getAttribute('target') || stream.target;
    if (streamTarget !== this.turboFrameTargetId) {
      const element = document.getElementById(streamTarget);
      if (element) {
        element.setAttribute('wait-for-frame-replaced', 'true');

        const needCloseModal = !this.element.contains(element) && element.getAttribute('data-modals-target') !== 'turboFrame';
        this.waitForFrameReplaced(`#${streamTarget}[wait-for-frame-replaced]`, (result) => {
          const element = document.getElementById(streamTarget);

          if (!result) {
            console.log('waitForFrameReplaced: failed', streamTarget);
            if (element)
              element.removeAttribute('wait-for-frame-replaced');
            return;
          }

          if (needCloseModal) {
            this.modal.forceClose = true;
            this.forceCloseModal();
            this.constructor.sleep(1000).then(() => {
              this.modal.forceClose = false;
            });
          }
  
          if (element)
            this.initHandleElements(element);
        });
      }
    }
  }

  handleTurboBeforeStreamRender(event) {
    const stream = event.detail.newStream;
    if (!stream)
      return;

    const template = stream.querySelector('template');
    if (!template)
      return;

    const streamTarget = stream.getAttribute('target') || stream.target;
    if (streamTarget !== this.turboFrameTargetId || !this.isModalOpen) {
      this.handleOtherRender(stream);
      return;
    }
    
    event.preventDefault();

    this.turboFrameTarget.setAttribute('wait-for-frame-replaced', 'true');

    const doc = template.content;
    let turboFrame = doc.querySelector('turbo-frame');
    if (!turboFrame) {
      turboFrame = document.createElement('turbo-frame');
      turboFrame.id = this.turboFrameTargetId;
      turboFrame.setAttribute('data-modals-target', 'turboFrame');
      while (doc.firstChild)
        turboFrame.appendChild(doc.firstChild);
      template.content.appendChild(turboFrame);
    }

    if (turboFrame.id === this.turboFrameTargetId && !turboFrame.getAttribute('data-modals-target'))
      turboFrame.setAttribute('data-modals-target', 'turboFrame');

    event.detail.render(stream).then(() => {
      const backupId = this.turboFrameTargetId;
      this.initHandleElements(this.turboFrameTarget);
      this.initFrameEvent(this.turboFrameTarget);

      this.waitForFrameReplaced(`turbo-frame#${backupId}[data-modals-target][wait-for-frame-replaced]`, (result) => {
        if (!result) {
          console.log('waitForFrameReplaced: failed', backupId);
          this.turboFrameTarget.removeAttribute('wait-for-frame-replaced');
        }
      });
    });
  }

  initModal() {
    this.element.addEventListener('show.bs.modal', this.showBsModal);
    this.element.addEventListener('hide.bs.modal', this.hideBsModal);
    this.element.style.zIndex = this.zIndexClass + 1;
    this.modal = new bootstrap.Modal(this.element);
  }

  cleanupEventHandlers() {
    document.removeEventListener('turbo:before-stream-render', this.handleTurboBeforeStreamRender);
  }

  cleanupModal() {
    this.element.removeEventListener('show.bs.modal', this.showBsModal);
    this.element.removeEventListener('hide.bs.modal', this.hideBsModal);
  }

  cleanupFrameEvent(element) {
    if (!element)
      element = this.turboFrameTarget;
    element.removeEventListener('turbo:fetch-request-error', this.handleTurboFrameFetchRequestError);
    element.removeEventListener('turbo:frame-load', this.initHandleElements);
    element.removeEventListener('turbo:before-fetch-response', this.handleBeforeFetchResponse);
    element.removeEventListener('turbo:before-fetch-request', this.awaitHandleBeforeFetchRequest);
  }

  showBsModal() {
    if (this.modal.forceClose)
      this.forceCloseModal();
    else
      this.setModalBackdropId();
  }

  setModalBackdropId() {
    if (this.modal._backdrop && this.modal._backdrop._element)
      this.modal._backdrop._element.style.zIndex = this.zIndexClass;
    else
      this.constructor.sleep(50).then(this.setModalBackdropId);
  }

  hideBsModal(ev) {
    if (!document.closingModal)
      document.closingModal = this.turboFrameTargetId;
    else if (document.closingModal !== this.turboFrameTargetId) {
      if (ev) {
        ev.preventDefault();
        ev.stopPropagation();
      }
      return;
    }

    document.activeElement.blur();

    let isAbort = false;
    if (this.abortController) {
      this.abortController.abort(this.abortReason);
      this.removeDisabledAttribute();
      this.abortController = null;
      isAbort = true;
    }

    this.removeDisabledAttribute();
    this.triggerElement = null;
    this.modal.forceClose = false;
    this.waitForModalToHide(() => {
      delete document.closingModal;

      if (this.confirmButton)
        this.confirmButton.classList.add('d-none');
    });

    const event = new CustomEvent('modals-controller:close', {
      detail: { isAbort },
    });
    this.element.dispatchEvent(event);
  }

  waitForModalToHide(callback, currentTry = 0, maxRetry = 20) {
    if (currentTry >= maxRetry) {
      if (callback) callback();
      return;
    }

    this.element.removeAttribute('aria-hidden');
    if (this.element.style.display !== 'none') {
      this.constructor.sleep(50).then(() => {
        this.waitForModalToHide(callback, currentTry + 1);
      });
    } else {
      if (callback) callback();
    }
  }

  removeDisabledAttribute() {
    if (!this.triggerElement)
      return;

    const shouldRemove = this.triggerElement.getAttribute('data-disable-on-request') === 'true' || this.triggerElement.getAttribute('type') === 'submit';
    if (shouldRemove) {
      this.triggerElement.removeAttribute('disabled');
      this.triggerElement.classList.remove('disabled');
    }

    const text = this.triggerElement.getAttribute('data-original-text');
    if (!text || !this.triggerElement.getAttribute('data-disable-with'))
      return;

    if (this.triggerElement.tagName === 'INPUT')
      this.triggerElement.value = text;
    else
      this.triggerElement.textContent = text;
    this.triggerElement.removeAttribute('data-original-text');
  }

  hideErrorContainers() {
    this.errorContainerTargets.forEach((container) => {
      container.classList.add('d-none');
    });
  }

  showErrorContainers() {
    this.errorContainerTargets.forEach((container) => {
      container.classList.remove('d-none');
    });
  }

  awaitHandleBeforeFetchRequest(event) {
    if (event.target.tagName === 'FORM') {
      const frameId = this.triggerElement?.getAttribute('data-turbo-frame');
      if (frameId && frameId !== event.target.getAttribute('data-turbo-frame')) return;
      else {
        const frameId = event.target.getAttribute('data-turbo-frame');
        if (frameId && frameId !== this.turboFrameTargetId) {
          // console.log('awaitHandleBeforeFetchRequest: not the target', frameId, this.turboFrameTargetId);
          return;
        }
      }
    }
    this.turboFrameTarget.removeAttribute('complete');

    this.hideErrorContainers();
    const { fetchOptions } = event.detail;
    this.modifyFetchOptions(fetchOptions);

    if (this.abortController) {
      this.abortController.abort(this.abortReason);
      this.removeDisabledAttribute();
    }

    this.abortController = new AbortController();
    fetchOptions.signal = this.abortController.signal;

    if (event.target.tagName === 'FORM') {
      this.constructor.sleep(180).then(() => {
        this.handleBeforeFetchRequest(event);
      });
    } else
      this.handleBeforeFetchRequest(event);
  }

  modifyFetchOptions(fetchOptions) {
    const request_method = this.triggerElement?.getAttribute('data-turbo-method');
    if (!request_method)
      return;

    const method = request_method.toLowerCase();
    if (method !== 'post' && method !== 'delete')
      return;

    const formData = new FormData();
    formData.append('_method', method.toUpperCase());

    const paramsAttr = this.triggerElement?.getAttribute(`data-${method}-params`);
    if (paramsAttr) {
      try {
        const params = JSON.parse(paramsAttr);
        for (const key in params) {
          formData.append(key, params[key]);
        }
      } catch (error) {
        console.error('Error parsing params:', error);
      }
    }
  
    fetchOptions.method = method.toUpperCase();
    fetchOptions.body = formData;
  }
  
  handleBeforeFetchRequest(event) {
    if (this.triggerElement?.getAttribute('data-show-modal-when-response') === 'true' ||
      event.target.getAttribute('data-show-modal-when-response') === 'true') {
      this.noNeedOpen = true;
      return;
    }

    this.openModal(event, this.turboFrameTarget.getAttribute('complete') == null);
  }

  waitForFrameReplaced(selector, callback, currentTry = 0, maxRetry = 20) {
    if (currentTry >= maxRetry) {
      if (callback) callback(false);
      return;
    }

    const target = document.querySelector(selector);
    if (target) {
      this.constructor.sleep(100).then(() => {
        this.waitForFrameReplaced(selector, callback, currentTry + 1);
      });
    } else {
      this.constructor.sleep(100).then(() => {
        if (callback) callback(true);
      });
    }
  }

  forceCloseModal(event) {
    if (!this.isModalOpen) {
      this.modal.forceClose = false;
      return;
    }

    if (this.modal.forceClose || this.isModalOpen) {
      this.closeModal(event);

      this.constructor.sleep(50).then(() => {
        this.forceCloseModal(event);
      });
    }
  }

  handleByTarget(event) {
    if (event.target.getAttribute('data-turbo-frame') === this.turboFrameTargetId) {
      if (this.handleError(event))
        return;

      this.modal.forceClose = true;
      this.forceCloseModal(event);
      this.constructor.sleep(1000).then(() => {
        this.modal.forceClose = false;
      });

      return;
    }

    if (this.handleError(event))
      return;

    const fetchResponse = event.detail.fetchResponse.response.clone();
    const fetchResponseIsStream = fetchResponse.headers.get('Content-Type').includes('text/vnd.turbo-stream.html');
    if (fetchResponseIsStream)
      return;

    this.setFrameContentFromResponse(fetchResponse);
  }

  handleError(event) {
    if (!event || !event.detail || !event.detail.fetchResponse)
      return false;

    const fetchResponse = event.detail.fetchResponse.response.clone();
    if (fetchResponse.status !== 200) {
      event.preventDefault();
      event.stopPropagation();

      this.parseContentAndDisplayError(fetchResponse);
      this.openModal(event);
      this.removeDisabledAttribute();

      return true;
    }

    return false;
  }

  setFrameContentFromResponse(response) {
    response.text().then((text) => {
      Turbo.renderStreamMessage(`
        <turbo-stream action='update' target='${this.turboFrameTargetId}'>
          <template>
            ${text}
          </template>
        </turbo-stream>
      `);
    }).catch((e) => {
      console.log('Error parsing the response HTML:', e);
    });
    this.removeDisabledAttribute();
  }

  handleFormResponse(event) {
    const handleModal = event.target.getAttribute('data-turbo-frame');
    if (handleModal !== this.turboFrameTargetId)
      return;

    if (!event.processing)
      event.processing = true;
    else {
      // console.log('handleBeforeFetchResponse: already processed', handleModal, this.turboFrameTargetId);
      return;
    }

    if (this.handleError(event))
      return;

    const fetchResponse = event.detail.fetchResponse.response.clone();
    const fetchResponseIsStream = fetchResponse.headers.get('Content-Type').includes('text/vnd.turbo-stream.html');
    if (fetchResponseIsStream) {
      if (this.noNeedOpen)
        this.noNeedOpen = false;

      if (this.triggerElement?.getAttribute('data-show-modal-when-response') === 'true' ||
        event.target.getAttribute('data-show-modal-when-response') === 'true') {
        if (!this.element.contains(event.target))
          this.closeModal(event);
      } else if (!this.element.contains(event.target))
        this.closeModal(event);

      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.setFrameContentFromResponse(fetchResponse);

    if (this.triggerElement?.getAttribute('data-show-modal-when-response') === 'true' ||
      event.target.getAttribute('data-show-modal-when-response') === 'true') {
      this.openModal(event);
    }
  }

  handleTurboFrameResponse(event) {
    this.removeDisabledAttribute();
    const fetchResponse = event.detail.fetchResponse.response.clone();
    if (fetchResponse.status !== 200) {
      event.preventDefault();

      const handleModal = this.getHandleModalController();
      if (handleModal) {
        if (handleModal.turboFrameTargetId !== this.turboFrameTargetId) {
          this.parseContentAndDisplayError(fetchResponse);
          handleModal.abortController = null;
          handleModal.closeModal(event);
        } else {
          handleModal.parseContentAndDisplayError(fetchResponse);
          handleModal.triggerElement = this.confirmButton;
        }
      } else {
        this.parseContentAndDisplayError(fetchResponse);
        this.openModal(event);
      }
      return;
    }

    if (this.triggerElement?.getAttribute('data-show-modal-when-response') === 'true' ||
      event.target.getAttribute('data-show-modal-when-response') === 'true')
      this.openModal(event);

    const fetchResponseIsStream = fetchResponse.headers.get('Content-Type').includes('text/vnd.turbo-stream.html');
    if (!fetchResponseIsStream) {
      event.preventDefault();

      const handleModal = this.getHandleModalController();
      if (handleModal) {
        if (handleModal.turboFrameTargetId !== this.turboFrameTargetId) {
          this.setFrameContentFromResponse(fetchResponse);
          handleModal.abortController = null;
          handleModal.closeModal(event);
        } else {
          handleModal.setFrameContentFromResponse(fetchResponse);
          this.closeModal(event);
        }
      } else
        this.setFrameContentFromResponse(fetchResponse);
    }
  }

  handleBeforeFetchResponse(event) {
    this.abortController = null;

    if (event.currentTarget.tagName === 'TURBO-FRAME')
      this.handleTurboFrameResponse(event);
    else if (event.currentTarget.tagName === 'FORM') {
      const handleModal = event.target.getAttribute('data-handle-modal');

      if (handleModal && handleModal !== this.turboFrameTargetId)
        this.handleByTarget(event);
      else
        this.handleFormResponse(event);
    }
  }

  handleTurboClickEvent(event) {
    this.removeDisabledAttribute();

    this.triggerElement = event.target;

    if (this.triggerElement.getAttribute('data-disable-on-request') === 'true') {
      this.triggerElement.setAttribute('disabled', 'disabled');
      this.triggerElement.classList.add('disabled');
    }

    const disableText = this.triggerElement.getAttribute('data-disable-with');
    if (disableText) {
      let text = this.triggerElement.textContent;
      this.triggerElement.textContent = disableText;

      this.triggerElement.setAttribute('data-original-text', text);
    }
  }

  setModalHeader() {
    const modalHeader = this.element.querySelector('.modal-header');
    if (!modalHeader)
      return;

    const title = this.triggerElement.getAttribute('data-modal-title') || this.defaultModalHeader;
    modalHeader.querySelector('.modal-title').textContent = title;
  }

  handleTurboSubmitStartEvent(event) {
    this.removeDisabledAttribute();

    this.triggerElement = event.detail.formSubmission.submitter;

    this.triggerElement.setAttribute('disabled', 'disabled');
    this.triggerElement.classList.add('disabled');
    const disableText = this.triggerElement.getAttribute('data-disable-with');
    if (disableText) {
      let text = this.triggerElement.textContent;
      if (this.triggerElement.tagName === 'INPUT') {
        text = this.triggerElement.value;
        this.triggerElement.value = disableText;
      } else
        this.triggerElement.textContent = disableText;

      this.triggerElement.setAttribute('data-original-text', text);
    }
  }

  initHandleElements(event) {
    let parentNode = (event && event.target) ? event.target : (event && event.tagName ? event : null);
    if (!parentNode)
      parentNode = document;

    const elements = parentNode.querySelectorAll('[data-turbo-frame]');
    elements.forEach((element) => {
      const frameId = element.getAttribute('data-turbo-frame');
      if (!frameId)
        return;

      const modal = document.querySelector(`[data-controller="modals"].${frameId}`);
      const controller = this.application.getControllerForElementAndIdentifier(modal, 'modals');

      if (!controller)
        return;

      if (element.classList.contains('event-added')) 
        return;

      element.classList.add('event-added');

      if (element.tagName === 'FORM') {
        element.addEventListener('turbo:submit-start', controller.handleTurboSubmitStartEvent);
        element.addEventListener('turbo:before-fetch-request', controller.awaitHandleBeforeFetchRequest);
        element.addEventListener('turbo:before-fetch-response', controller.handleBeforeFetchResponse);
        element.addEventListener('turbo:fetch-request-error', controller.handleFormFetchRequestError);
      } else
        controller.addClickEventToElement(element);
    });
  }

  addClickEventToElement(element) {
    const confirmMessage = element.getAttribute('data-turbo-confirm');
    if (confirmMessage) {
      element.addEventListener('click', (e) => {
        e.preventDefault();

        this.backupConfirmMessage = confirmMessage;
        this.setFrameContent(confirmMessage);
        if (this.confirmButton) {
          const confirmYes = element.getAttribute('data-confirm-yes') || 'Yes';
          this.confirmButton.classList.remove('d-none');
          this.confirmButton.textContent = confirmYes;
        }

        this.openModalByTriggerElement(e, element, false);
      });
      return;
    }

    let alertMessage = element.getAttribute('data-alert');
    if (alertMessage) {
      element.addEventListener('click', (e) => {
        e.preventDefault();
        this.setFrameContent(alertMessage);
        this.openModalByTriggerElement(e, element, false);
      });
      return;
    }

    alertMessage = element.getAttribute('data-alert-selector');
    if (alertMessage) {
      element.addEventListener('click', (e) => {
        e.preventDefault();
        const alertElement = document.querySelector(alertMessage);
        if (alertElement)
          this.setFrameContent(alertElement.innerHTML);
        this.openModalByTriggerElement(e, element, false);
    });
      return;
    }

    element.addEventListener('turbo:click', this.handleTurboClickEvent);
  }

  handleFetchRequestError(event) {
    event.preventDefault();

    if (event.detail.error === this.abortReason)
      return;

    this.modal.forceClose = true;
    this.forceCloseModal(event);
    this.constructor.sleep(1000).then(() => {
      this.modal.forceClose = false;
    });
    this.removeDisabledAttribute();
  }

  handleTurboFrameFetchRequestError(event) {
    console.log('turbo:fetch-request-error on turbo-frame fired', event);
    this.handleFetchRequestError(event);
  }

  handleFormFetchRequestError(event) {
    console.log('turbo:fetch-request-error on form fired', event);
    this.handleFetchRequestError(event);
  }

  initFrameEvent(element) {
    if (!element)
      element = this.turboFrameTarget;

    if (element.classList.contains('event-added'))
      return;

    element.classList.add('event-added');
    element.addEventListener('turbo:fetch-request-error', this.handleTurboFrameFetchRequestError);
    element.addEventListener('turbo:frame-load', this.initHandleElements);
    element.addEventListener('turbo:before-fetch-response', this.handleBeforeFetchResponse);
    element.addEventListener('turbo:before-fetch-request', this.awaitHandleBeforeFetchRequest);
  }

  initRetryButtonClickHandle() {
    this.errorContainerTargets.forEach((container) => {
      const retryButton = container.querySelector('.retry-button');
      if (retryButton)
        retryButton.addEventListener('click', this.retryRequest);
    });
  }

  initConfirmButtonClickHandle() {
    if (!this.confirmButton)
      return;

    this.confirmButton.addEventListener('click', (ev) => {
      ev.preventDefault();
      this.fireConfirmAction(ev);
    });
  }

  handleModalClose(event) {
    const { detail } = event || {};
    const { isAbort } = detail || {};
    if (isAbort) {
      this.confirmButton.classList.remove('d-none');
      this.abortController.abort(this.abortReason);
      this.abortController = null;
    }
    this.setFrameContent(this.backupConfirmMessage);
    event.target.removeEventListener('modals-controller:close', this.handleModalClose);
  }

  fireConfirmAction(ev) {
    const handleModal = this.getHandleModalController();
    this.abortController = new AbortController();
    if (handleModal) {
      handleModal.abortController = this.abortController;
      handleModal.element.addEventListener('modals-controller:close', this.handleModalClose);

      handleModal.openModalByTriggerElement(ev, this.triggerElement, true);
    }
    else
      this.setLoading();
  
    this.confirmButtonClicked = true;
    const event = new CustomEvent('turbo:click', {
      cancelable: true,
      bubbles: true,
      composed: true,
      detail: {
        url: this.triggerElement.getAttribute('href'),
        originalEvent: ev
      }
    });

    this.confirmButton.classList.add('d-none');
    this.triggerElement.dispatchEvent(event);
  }

  getHandleModalController() {
    const handleModal = this.triggerElement.getAttribute('data-handle-modal');
    if (handleModal) {
      const modal = document.querySelector(`[data-controller="modals"].${handleModal}`);
      return this.application.getControllerForElementAndIdentifier(modal, 'modals');
    }
  }

  retryRequest(ev) {
    this.setLoading();
    this.hideErrorContainers();
    if (this.confirmButtonClicked && this.confirmButton)
      this.fireConfirmAction(ev);
    else
      this.triggerElement.click();
  }

  parseContentAndDisplayError(response) {
    const contentType = response.headers.get('Content-Type');
    if (!contentType) {
      this.setFrameContent('Error: Unable to process your request.');
      return;
    }

    if (contentType.includes('text/html')) {
      response.text()
      .then(this.displayErrorFromHtml.bind(this))
      .catch(() => this.setFrameContent('Error: Unable to process your request.'));
    } else if (contentType.includes('application/json')) {
      response.json().then(this.displayErrorFromJson.bind(this));
    }
  }

  /*
  reinitFrameContent(html) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const turboStreams = doc.querySelectorAll('turbo-stream');
      turboStreams.forEach((frame) => {
        const frameId = frame.getAttribute('target');
        const currentFrame = document.getElementById(frameId);
        if (currentFrame) {
          if (frameId === this.turboFrameTargetId && !currentFrame.getAttribute('data-modal-target'))
            currentFrame.setAttribute('data-modal-target', 'turboFrame');
          this.initHandleElements(currentFrame);
          this.initFrameEvent(currentFrame);
        }
      });
    } catch (e) {
      console.log('Error parsing the frame HTML:', e);
    }
  }
  */

  displayErrorFromHtml(html) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const errorTitle = doc.querySelector('title') ? doc.querySelector('title').textContent : 'Unknown Error';
      const errorContent = this.extractHtmlErrorContent(doc.body);

      this.setFrameContent(`
      <div class='alert-danger alert'>
      Error:<br/>${errorTitle}<br/>Details:<br/>${errorContent}
      </div>`);
    } catch (e) {
      console.log('Error parsing the response HTML:', e);
      this.setFrameContent('Error: Unable to process your request.');
    }

    this.showErrorContainers();
  }

  extractHtmlErrorContent(body) {
    const header = body.querySelector('header');
    const header2 = body.querySelector('#container > h2');
    let bodyFrame = body.querySelector('#frame-source-0-0');
    const exceptionFrame = body.querySelector('.exception-message') || body.querySelector('#container > pre');
    
    // Add 'table' and 'table-striped' classes to any table inside bodyFrame
    if (bodyFrame) {
      const table = bodyFrame.querySelector('table');
      if (table) {
        table.classList.add('table', 'table-striped');
      }
    } else {
      bodyFrame = body.querySelector('.rails-default-error-page');
    }

    return `
      <div class='error-header mb-2'>${header ? header.innerText : ''}</div>
      <div class='error-header2 mb-2'>${header2 ? header2.innerText : ''}</div>
      <div class='error-exception'>${exceptionFrame ? exceptionFrame.innerHTML : ''}</div>
      <div class='error-body'>${bodyFrame ? bodyFrame.innerHTML : ''}</div>
    `;
  }

  displayErrorFromJson(json) {
    const errorHeader = json.error || 'An unexpected error occurred.';
    this.setFrameContent(`
      <div class='error-header mb-2'>${errorHeader}</div>
      <div class='alert-danger alert'>JSON Error:<br/>${JSON.stringify(json, null, 2)}</div>
    `);
    this.showErrorContainers();
  }

  setFrameContent(content) {
    this.turboFrameTarget.innerHTML = content;
  }

  setLoading() {
    this.setFrameContent(`
    <div class='text-center'>
      <div class='spinner-border text-primary' role='status'>
        <span class='visually-hidden'>Loading...</span>
      </div>
    </div>
    `);
  }

  openModal(event, setLoading = true) {
    if (!this.isModalOpen) {
      this.hideErrorContainers();
      this.setModalHeader();

      if (setLoading)
        this.setLoading();
      this.modal.show();
    }
  }

  openModalByTriggerElement(event, element = null, setLoading = false) {
    if (!element)
      element = this.event.target;

    if (this.triggerElement)
      this.removeDisabledAttribute();

    this.triggerElement = element;
    const closable = element.getAttribute('data-closable');
    this.modal._config.backdrop = (closable == null || closable.toString() === 'true') ? true : 'static';

    this.openModal(event, setLoading);
  }

  closeModal(event) {
    // if (this.confirmButton)
    //   this.confirmButton.classList.add('d-none');
    this.modal._config.backdrop = true;
    this.backupConfirmMessage = null;
    this.confirmButtonClicked = false;
    this.modal.hide();
  }

  getFrameId(event) {
    if (event.target.tagName === 'TURBO-FRAME')
      return event.target.id;
    else
      return event.target.getAttribute('data-turbo-frame');
  }
}
