import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";


export class AwsCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const cloudfrontOAI = new cloudfront.OriginAccessIdentity(this, "JSCC-OAI")
    
    const bucket = new s3.Bucket(this, 'StaticAppBucket', {
      bucketName: 'rs-aws-serving-spa-cdk',
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,      
      removalPolicy: RemovalPolicy.DESTROY,
    })

    bucket.addToResourcePolicy(new iam.PolicyStatement({
      actions: ["S3:GetObject"],
      resources: [bucket.arnForObjects('*')],
      principals: [new iam.CanonicalUserPrincipal(cloudfrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId)]
    }))


    const distribution = new cloudfront.Distribution(this, 'StaticAppBucketDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessIdentity(bucket, {
          originAccessIdentity: cloudfrontOAI
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: "index.html",
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
      ],
    });

    new s3deploy.BucketDeployment(this, "DeployWebsite", {
      sources: [s3deploy.Source.asset("../dist")],
      destinationBucket: bucket,
      distribution,
      distributionPaths: ["/*"],
    });

    new cdk.CfnOutput(this, "DistributionDomainName", {
      value: distribution.distributionDomainName,
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
    });

  }
}
