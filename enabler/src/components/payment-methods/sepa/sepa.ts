import {
  ComponentOptions,
  PaymentComponent,
  PaymentComponentBuilder,
  PaymentMethod
} from '../../../payment-enabler/payment-enabler';

import { BaseComponent } from "../../base";

import styles from '../../../style/style.module.scss';
import buttonStyles from "../../../style/button.module.scss";

import {
  PaymentOutcome,
  PaymentRequestSchemaDTO,
} from "../../../dtos/novalnet-payment.dto";

import { BaseOptions } from "../../../payment-enabler/novalnet-payment-enabler";

export class SepaBuilder
  implements PaymentComponentBuilder {

  public componentHasSubmit = true;

  constructor(
    private baseOptions: BaseOptions
  ) {}

  build(
    config: ComponentOptions
  ): PaymentComponent {

    return new Sepa(
      this.baseOptions,
      config
    );
  }
}

export class Sepa extends BaseComponent {

  private showPayButton: boolean;

  constructor(
    baseOptions: BaseOptions,
    componentOptions: ComponentOptions
  ) {

    super(
      PaymentMethod.sepa,
      baseOptions,
      componentOptions
    );

    this.showPayButton =
      componentOptions?.showPayButton ?? false;
  }

  mount(selector: string) {

    const safeSelector =
      selector.replace(/\|/g, '\\|');

    const container =
      document.querySelector(safeSelector);

    if (!container) {

      console.error(
        'Container not found:',
        safeSelector
      );

      return;
    }

    // IMPORTANT FIX
    container.innerHTML =
      this._getTemplate();

    // Load Novalnet script once
    if (!(window as any).NovalnetUtility) {

      const script =
        document.createElement('script');

      script.src =
        'https://cdn.novalnet.de/js/v2/NovalnetUtility.js';

      script.async = true;

      document.body.appendChild(script);
    }

    // Attach IBAN formatter safely
    setTimeout(() => {

      const NovalnetUtility =
        (window as any).NovalnetUtility;

      const ibanInput =
        document.getElementById(
          'sepaForm-iban'
        ) as HTMLInputElement;

      const bicWrapper =
        document.getElementById(
          'sepa-bic-wrapper'
        );

      const bicInput =
        document.getElementById(
          'sepaForm-bic'
        ) as HTMLInputElement;

      if (
        ibanInput &&
        NovalnetUtility
      ) {

        ibanInput.addEventListener(
          'keyup',
          (event) => {

            NovalnetUtility.formatIban(
              event,
              'sepa-bic-wrapper'
            );
          }
        );

        ibanInput.addEventListener(
          'keypress',
          (event) => {

            NovalnetUtility.checkIban(
              event,
              'sepa-bic-wrapper'
            );
          }
        );

        ibanInput.addEventListener(
          'change',
          (event) => {

            NovalnetUtility.formatIban(
              event,
              'sepa-bic-wrapper'
            );
          }
        );
      }

      if (
        bicInput &&
        NovalnetUtility
      ) {

        bicInput.addEventListener(
          'keypress',
          (event) => {

            NovalnetUtility.formatBic(
              event
            );
          }
        );

        bicInput.addEventListener(
          'change',
          (event) => {

            NovalnetUtility.formatBic(
              event
            );
          }
        );
      }

    }, 500);

    if (this.showPayButton) {

      const button =
        container.querySelector(
          "#sepaForm-paymentButton"
        );

      if (button) {

        button.addEventListener(
          "click",
          (e) => {

            e.preventDefault();

            this.submit();
          }
        );
      }
    }
  }

  async submit() {

    this.sdk.init({
      environment: this.environment
    });

    const pathLocale =
      window.location.pathname.split("/")[1];

    const url =
      new URL(window.location.href);

    const baseSiteUrl =
      url.origin;

    try {

      const accountHolderInput =
        document.getElementById(
          'sepaForm-accountHolder'
        ) as HTMLInputElement;

      const ibanInput =
        document.getElementById(
          'sepaForm-iban'
        ) as HTMLInputElement;

      const bicInput =
        document.getElementById(
          'sepaForm-bic'
        ) as HTMLInputElement;

      const accountHolder =
        accountHolderInput?.value.trim() ?? '';

      const iban =
        ibanInput?.value.trim() ?? '';

      const bic =
        bicInput?.value.trim() ?? '';

      const requestData:
        PaymentRequestSchemaDTO = {

        paymentMethod: {
          type: "DIRECT_DEBIT_SEPA",

          accHolder:
            accountHolder,

          iban:
            iban,

          bic:
            bic,
        },

        paymentOutcome:
          PaymentOutcome.AUTHORIZED,

        lang:
          pathLocale ?? 'de',

        path:
          baseSiteUrl,
      };

      console.log(
        'SEPA Request:',
        requestData
      );

      const response = await fetch(
        this.processorUrl + "/directPayment",
        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "X-Session-Id":
              this.sessionId,
          },

          body: JSON.stringify(
            requestData
          ),
        }
      );

      if (!response.ok) {

        const errorText =
          await response.text();

        console.error(
          'HTTP error response:',
          errorText
        );

        throw new Error(
          `HTTP error! status: ${response.status}`
        );
      }

      const data =
        await response.json();

      console.log(
        'SEPA Response:',
        data
      );

      if (
        data &&
        data.paymentReference
      ) {

        const paymentReference =
          typeof data.paymentReference === 'string'
            ? data.paymentReference
            : data.paymentReference.id;

        console.log(
          'Calling onComplete with:',
          paymentReference
        );

        this.onComplete?.({
          isSuccess: true,

          paymentReference:
            paymentReference,
        });

      } else {

        console.error(
          'Missing paymentReference:',
          data
        );

        this.onError(
          "Payment reference missing."
        );
      }

    } catch (e) {

      console.error(
        'SEPA payment error:',
        e
      );

      this.onError(
        "Some error occurred. Please try again."
      );
    }
  }

  private _getTemplate() {

    const locale =
      document.documentElement.lang || "en";

    return `
    <div class="${styles.wrapper}">

      <div
        style="
          display:flex;
          flex-direction:column;
          gap:16px;
        "
      >

        <!-- Account Holder -->
        <div>

          <label for="sepaForm-accountHolder">
            ${
              locale.startsWith("de")
                ? "Kontoinhaber"
                : "Account Holder"
            }
          </label>

          <input
            type="text"
            id="sepaForm-accountHolder"
            name="accountHolder"

            style="
              width:100%;
              padding:12px;
              margin-top:6px;
            "
          />

        </div>

        <!-- IBAN -->
        <div>

          <label for="sepaForm-iban">
            IBAN
          </label>

          <input
            type="text"
            id="sepaForm-iban"
            name="iban"

            style="
              width:100%;
              padding:12px;
              margin-top:6px;
              text-transform:uppercase;
            "
          />

        </div>

        <!-- BIC -->
        <div
          id="sepa-bic-wrapper"

          style="
            display:none;
            flex-direction:column;
          "
        >

          <label for="sepaForm-bic">
            BIC
          </label>

          <input
            type="text"
            id="sepaForm-bic"
            name="bic"

            style="
              width:100%;
              padding:12px;
              margin-top:6px;
            "
          />

        </div>

        ${
          this.showPayButton
            ? `
            <button
              class="${buttonStyles.button}
              ${buttonStyles.fullWidth}
              ${styles.submitButton}"

              id="sepaForm-paymentButton"
            >
              ${
                locale.startsWith("de")
                  ? "Bezahlen"
                  : "Pay"
              }
            </button>
            `
            : ""
        }

      </div>

    </div>
    `;
  }
}