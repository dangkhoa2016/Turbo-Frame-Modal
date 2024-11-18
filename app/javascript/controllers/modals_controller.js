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

  connect() {
    this.turboFrameTargetId = this.turboFrameTarget.id;
    this.initEventHandlers();
    this.initModal();
    this.initHandleElements();
    this.initFrameEvent();
    this.initRetry();
    this.setLoading();

    document.addEventListener('turbo:before-stream-render', this.turboBeforeStreamRender);
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
    this.turboBeforeStreamRender = this.turboBeforeStreamRender.bind(this);
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
    this.turboBeforeStreamRender = this.turboBeforeStreamRender.bind(this);
    this.initHandleElements = this.initHandleElements.bind(this);
  }

  handleOtherRender(stream) {
    if (!stream)
      return;
    
    const streamTarget = stream.getAttribute('target') || stream.target;
    if (streamTarget !== this.turboFrameTargetId) {
      const element = document.getElementById(streamTarget);
      if (element) {
        element.setAttribute('wait-for-frame-replaced', 'true');
        this.waitForFrameReplaced(`#${streamTarget}[wait-for-frame-replaced]`, (result) => {
          if (!result) {
            console.log('waitForFrameReplaced: failed', streamTarget);
            const element = document.getElementById(streamTarget);
            if (element)
              element.removeAttribute('wait-for-frame-replaced');
            return;
          }

          this.modal.forceClose = true;
          this.close();
          this.constructor.sleep(800).then(() => {
            this.modal.forceClose = false;
          });

          const element = document.getElementById(streamTarget);
          if (element)
            this.initHandleElements(element);
        });
      }
    }
  }

  turboBeforeStreamRender(event) {
    if (!this.isModalOpen) {
      this.handleOtherRender(event.detail.newStream);
      return;
    }

    const stream = event.detail.newStream;
    if (!stream)
      return;

    const template = stream.querySelector('template');
    if (!template)
      return;

    
    const streamTarget = stream.getAttribute('target') || stream.target;
    if (streamTarget !== this.turboFrameTargetId) {
      this.handleOtherRender(stream);
      return;
    }
    
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

      this.waitForFrameReplaced(`turbo-frame#${backupId}[data-modals-target][wait-for-frame-replaced]`, (result) => {
        if (!result) {
          console.log('waitForFrameReplaced: failed', backupId);
          this.turboFrameTarget.removeAttribute('wait-for-frame-replaced');
          return;
        }

        const turboFrame = document.getElementById(this.turboFrameTargetId);
        this.initFrameEvent(turboFrame);
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
    document.removeEventListener('turbo:before-stream-render', this.turboBeforeStreamRender);
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
      this.forceClose();
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
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }

    if (this.abortController) {
      this.abortController.abort(this.abortReason);
      console.log('Abort signal sent:', this.abortController, this.turboFrameTargetId);
      this.removeDisabledAttribute();
      this.abortController = null;
    }

    this.modal.forceClose = false;
    this.waitForModalReallyHide(() => {
      delete document.closingModal;
    });
  }

  waitForModalReallyHide(cb, currentTry = 0, maxRetry = 20) {
    if (currentTry >= maxRetry) {
      if (cb) cb();
      return;
    }

    if (this.element.style.display !== 'none') {
      this.constructor.sleep(50).then(() => {
        this.waitForModalReallyHide(cb, currentTry + 1);
      });
    } else {
      if (cb) cb();
    }
  }

  removeDisabledAttribute() {
    if (this.triggerElement?.getAttribute('data-disable-on-reponse') !== 'true') {
      this.triggerElement?.removeAttribute('disabled');
      this.triggerElement?.classList.remove('disabled');
    }
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
    this.abortController = new AbortController();
    fetchOptions.signal = this.abortController.signal;

    if (event.target.tagName === 'FORM') {
      this.constructor.sleep(180).then(() => {
        this.handleBeforeFetchRequest(event);
      });
    } else
      this.handleBeforeFetchRequest(event);
  }

  handleBeforeFetchRequest(event) {
    if (this.triggerElement?.getAttribute('data-show-modal-when-response') === 'true' ||
      event.target.getAttribute('data-show-modal-when-response') === 'true') {
      this.noNeedOpen = true;
      return;
    }

    this.open(event, this.turboFrameTarget.getAttribute('complete') == null);
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

  forceClose(event) {
    if (this.modal.forceClose) {
      this.close(event);

      this.constructor.sleep(50).then(() => {
        this.forceClose(event);
      });
    }
  }

  handleByTarget(event) {
    if (event.target.getAttribute('data-turbo-frame') === this.turboFrameTargetId) {
      const fetchResponse = event.detail.fetchResponse.response.clone();
      if (fetchResponse.status !== 200) {
        event.stopPropagation();
        event.preventDefault();

        this.parseContentAndDisplayError(fetchResponse);
        this.open(event);
        return;
      }

      this.modal.forceClose = true;
      this.close(event);
      this.constructor.sleep(800).then(() => {
        this.modal.forceClose = false;
      });

      return;
    }

    const turboFrame = event.target.closest('turbo-frame');
    if (turboFrame && turboFrame?.id !== this.turboFrameTargetId) {
      const fetchResponse = event.detail.fetchResponse.response.clone();
      if (fetchResponse.status !== 200) {
        event.preventDefault();

        this.parseContentAndDisplayError(fetchResponse);
        this.open(event);
        return;
      }

      this.modal.forceClose = true;
      this.close(event);
      this.constructor.sleep(800).then(() => {
        this.modal.forceClose = false;
      });

      return;
    }

    const fetchResponse = event.detail.fetchResponse.response.clone();
    if (fetchResponse.status !== 200) {
      event.preventDefault();

      this.parseContentAndDisplayError(fetchResponse);
      this.open(event);
      return;
    } else {
      const fetchResponseIsStream = fetchResponse.headers.get('Content-Type').includes('text/vnd.turbo-stream.html');
      if (fetchResponseIsStream)
        return;

      fetchResponse.text().then((text) => {
        this.setFrameContent(text);
        const turboFrames = this.turboFrameTarget.querySelectorAll('turbo-frame');
        turboFrames.forEach((frame) => {
          frame.removeAttribute('id');
        });
        this.initHandleElements(this.turboFrameTarget);
      }).catch((e) => {
        console.log('Error parsing the response HTML:', e);
      });
    }
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

    const fetchResponse = event.detail.fetchResponse.response.clone();
    if (fetchResponse.status !== 200) {
      event.preventDefault();

      this.parseContentAndDisplayError(fetchResponse);
      this.open(event);
      return;
    }

    const fetchResponseIsStream = fetchResponse.headers.get('Content-Type').includes('text/vnd.turbo-stream.html');
    if (fetchResponseIsStream) {
      if (this.noNeedOpen) {
        this.noNeedOpen = false;
        return;
      }
    }

    if (this.triggerElement?.getAttribute('data-show-modal-when-response') === 'true' ||
      event.target.getAttribute('data-show-modal-when-response') === 'true') {
      this.open(event);
    }
  }

  handleTurboFrameResponse(event) {
    this.removeDisabledAttribute();
    const fetchResponse = event.detail.fetchResponse.response.clone();
    if (fetchResponse.status !== 200) {
      event.preventDefault();

      this.parseContentAndDisplayError(fetchResponse);
      this.open(event);
      return;
    }

    if (this.triggerElement?.getAttribute('data-show-modal-when-response') === 'true' ||
      event.target.getAttribute('data-show-modal-when-response') === 'true')
      this.open(event);
  }

  handleBeforeFetchResponse(event) {
    this.abortController = null;

    if (event.target.tagName === 'TURBO-FRAME')
      this.handleTurboFrameResponse(event);
    else if (event.target.tagName === 'FORM') {
      if (event.target.getAttribute('data-handle-by-target') === 'true')
        this.handleByTarget(event);
      else
        this.handleFormResponse(event);
    }
  }

  handleTurboClickEvent(event) {
    this.triggerElement = event.target;

    if (this.triggerElement.getAttribute('data-disable-on-request') === 'true') {
      this.triggerElement.setAttribute('disabled', 'disabled');
      this.triggerElement.classList.add('disabled');
    }
  }

  handleTurboSubmitStartEvent(event) {
    this.triggerElement = event.detail.formSubmission.submitter;
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
      }
      else
        element.addEventListener('turbo:click', controller.handleTurboClickEvent);
    });
  }

  handleTurboFrameFetchRequestError(event) {
    console.log('turbo:fetch-request-error on turbo-frame fired', event);
    event.preventDefault();

    if (event.detail.error === this.abortReason)
      return;

    this.modal.forceClose = true;
    this.constructor.sleep(500).then(() => {
      this.close(event);
      this.constructor.sleep(800).then(() => {
        this.modal.forceClose = false;
      });
    });
  }

  handleFormFetchRequestError(event) {
    console.log('turbo:fetch-request-error on form fired', event);
    event.preventDefault();
    
    if (event.detail.error === this.abortReason)
      return;

    this.modal.forceClose = true;
    this.constructor.sleep(500).then(() => {
      this.close(event);
      this.constructor.sleep(800).then(() => {
        this.modal.forceClose = false;
      });
    });
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

  initRetry() {
    this.errorContainerTargets.forEach((container) => {
      const retryButton = container.querySelector('.retry-button');
      retryButton.addEventListener('click', this.retryRequest);
    });
  }

  retryRequest() {
    this.setLoading();
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
    </div>`
    );
  }

  open(event, setLoading = true) {
    if (!this.isModalOpen) {
      if (setLoading)
        this.setLoading();
      this.modal.show();
    }
  }

  close(event) {
    this.modal.hide();
  }

  getFrameId(event) {
    if (event.target.tagName === 'TURBO-FRAME')
      return event.target.id;
    else
      return event.target.getAttribute('data-turbo-frame');
  }
}
